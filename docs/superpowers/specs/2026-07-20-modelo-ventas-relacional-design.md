# Modelo de ventas relacional y ACID — diseño

Fecha: 2026-07-20 · Estado: aprobado por Maxi (pendiente revisión del spec)

## Problema

El modelo de ventas actual tiene dos defectos que Maxi quiere corregir:

1. **No es ACID.** Registrar una venta se hace en varios requests sueltos desde
   el cliente (`createVenta`, luego `updateEquipo` por cada equipo, luego
   `generateCobros`, luego `createComisiones`), con `try/catch` best-effort. Si
   uno falla a mitad, queda estado parcial (venta sin cobros, stock sin
   actualizar, comisión sin registrar).
2. **Está desnormalizado.** La venta copia `equipo_label`/`imei`/`categoria` de
   "el" equipo y mete todos los equipos vendidos en una columna JSON `lineas`.
   No hay una relación real venta→equipo, y `ventas.equipo_id` existe pero nunca
   se escribe (queda `null` en todas las filas).

## Objetivo

Un modelo relacional con integridad referencial, donde una venta es una
cabecera que referencia a sus equipos por FK a través de una tabla de items
(soportando varios equipos por venta), y donde crear/borrar una venta es una
operación atómica (todo o nada) vía función Postgres.

## Decisiones tomadas

| Decisión | Elección |
|---|---|
| Datos del equipo en el item | **FK + foto al vender**: el item guarda `equipo_id` (FK) más una foto de modelo/IMEI/precio/costo congelada al momento de la venta. |
| Atomicidad | **Función Postgres** (`crear_venta`, `borrar_venta`) que corre todo en una transacción. El cliente llama `supabase.rpc(...)`. |
| Varios equipos por venta | Tabla nueva **`venta_items`**, una fila por equipo. Reemplaza el JSON `lineas`. |
| Garantía | **Por equipo**: el vencimiento (`garantia_vence`/`sin_garantia`) va en `venta_items`. El comprobante PDF (`garantia_url`/`garantia_nombre`) queda uno por venta. |
| Borrado de equipo | FK `venta_items.equipo_id` con **ON DELETE RESTRICT** (no se puede borrar un equipo vendido). `venta_items.venta_id` con **ON DELETE CASCADE**. |
| Lecturas | **Embedding de Supabase**: `.select('*, venta_items(*)')`. `rowToVenta` arma la forma que hoy consume la app. |
| Rollout | Big-bang probado en `dev`, migración corrida en producción al mergear a `master`. |

## Esquema

### `ventas` (cabecera — se reescribe)

Queda: `id` (PK), `cliente_id` (FK→clientes), `cliente_nombre` (foto, por si se
borra el cliente), `fecha`, `tc`, `modalidad` (contado/cuotas), `cuotas`,
`anticipo`, `cuota_monto`, `metodo`, `canje` (bool), `canje_valor`,
`canje_equipo_id` (FK→equipos, el equipo que ingresó por canje, nullable),
`garantia_url`, `garantia_nombre` (comprobante, uno por venta),
`total_usd`, `total_costo` (calculados dentro de la transacción al crear),
`vendedor_numero`, `negocio_id` (default `negocio_actual()`), `owner_id`
(default `auth.uid()`), `created_at`.

**Se eliminan** de la cabecera: `equipo_label`, `imei`, `categoria`, `usd`,
`costo`, `garantia_vence`, `sin_garantia`, `lineas`, `equipo_id`, `canje_equipo`
(texto). Su información pasa a `venta_items` o a las columnas nuevas de arriba.

### `venta_items` (nueva — un renglón por equipo)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `venta_id` | uuid FK→ventas | **ON DELETE CASCADE** |
| `equipo_id` | uuid FK→equipos | **ON DELETE RESTRICT**; nullable solo para líneas sin equipo del stock |
| `cantidad` | int not null default 1 | accesorios pueden ser >1 |
| `precio_usd` | numeric not null | lo realmente cobrado por unidad (puede diferir del precio de lista) |
| `costo` | numeric | costo unitario al vender (nullable) |
| `es_regalo` | boolean not null default false | ítem a US$0 que descuenta stock |
| `comision` | numeric not null default 0 | comisión manual al negocio dueño (equipo ajeno) |
| `negocio_duenio` | uuid | negocio dueño del equipo (para cuenta corriente) |
| `equipo_label` | text not null | foto del modelo+spec al vender |
| `imei` | text | foto |
| `categoria` | text | foto (para el desglose de Ganancias) |
| `garantia_vence` | date | vencimiento de garantía de ESTE equipo (null = sin garantía) |
| `sin_garantia` | boolean not null default false | |
| `created_at` | timestamptz default now() | |

`negocio_id`/`owner_id` no hacen falta en `venta_items` (heredan el alcance de
la venta por el FK); la RLS del item se valida contra la venta padre.

### RLS

- `ventas`: igual que hoy (privado por usuario: `negocio_id`+`owner_id`).
- `venta_items`: select/insert/delete permitidos si la venta padre pertenece al
  usuario (`exists (select 1 from ventas v where v.id = venta_id and v.owner_id
  = auth.uid())`). Insert/borrado en la práctica solo ocurren dentro de las
  funciones `crear_venta`/`borrar_venta`, que corren como el usuario.

## Funciones (ACID)

### `crear_venta(payload jsonb) returns uuid`

`security invoker` (respeta RLS del usuario). En una transacción:

1. Insert en `ventas` con los campos de cabecera; `total_usd`/`total_costo` se
   calculan sumando los items (los regalos no suman a `total_usd`).
2. Insert de cada `venta_items` desde `payload->'items'`.
3. Por cada item con `equipo_id`: update del equipo — teléfonos → `estado =
   'vendido'`; accesorios → descontar `cantidad` (si queda 0, `vendido`; si
   queda >0, sigue `disponible`). Agrupar cantidades por equipo (mismo equipo en
   varias líneas: normal + regalo).
4. Si `modalidad = 'cuotas'`: generar las filas de `cobros` (misma lógica de
   redondeo con última cuota ajustada; primera cuota hoy opcional). Falla si el
   monto por cuota < US$1.
5. Por cada item de equipo ajeno (`negocio_duenio <> negocio_actual()`): insert
   en `comisiones` (capital = costo×cantidad, monto = comisión).
6. Si hay canje con `canje_equipo_data`: insert del equipo de canje en `equipos`
   y set de `ventas.canje_equipo_id`.
7. Return `ventas.id`.

Cualquier error → rollback total. Devuelve el id para que el cliente recargue.

### `borrar_venta(p_venta_id uuid) returns void`

En una transacción: restaurar stock de cada item (teléfono → `disponible`;
accesorio → sumar `cantidad`), borrar `cobros` y `comisiones` de la venta, borrar
la venta (los `venta_items` caen por CASCADE). Todo o nada.

## Capa de datos (`src/lib/db.js`)

- `createVenta(v)` → arma el `payload` jsonb (cabecera + array de items desde
  `v.lineas`) y llama `supabase.rpc('crear_venta', { payload })`. Devuelve la
  venta recién creada (re-fetch por id con embedding).
- `deleteVenta(id)` → `supabase.rpc('borrar_venta', { p_venta_id: id })`.
- `fetchVentas()` → `.from('ventas').select('*, venta_items(*)')`.
- `rowToVenta(r)` → mapea la cabecera y arma `lineas` desde `r.venta_items`
  (cada item → `{ equipoId, equipo, imei, categoria, usd: precio_usd, costo,
  cantidad, esRegalo, comision, negocioDuenio, garantiaVence, sinGarantia }`),
  para que los consumidores actuales sigan funcionando. La garantía de la venta
  para vistas que la muestran a nivel cabecera se deriva (ej. la más lejana, o
  se muestra por equipo en el detalle).
- Se elimina `ventaToRow` (lo reemplaza el armado del payload) y el retry de
  columnas de garantía (ya no aplica).

## UI afectada

- **Venta.jsx**: el selector de garantía pasa de una vez por venta a **uno por
  equipo** en el carrito (3 meses / fecha / sin garantía por cada teléfono; los
  accesorios siempre sin garantía). `buildLineas` incluye `garantiaVence`/
  `sinGarantia` por línea.
- **VentaDetalleModal.jsx**: muestra la garantía por equipo.
- **Reservas.jsx** (ConvertirModal): la línea que arma ya incluye
  `garantiaVence`/`sinGarantia` (hoy los manda a nivel venta; pasan al item).
- **Ganancias.jsx**, **Ventas.jsx**, **Clientes.jsx**: siguen leyendo `lineas`
  (que ahora viene de `venta_items`); cambios mínimos o nulos.
- **App.jsx**: `handleConfirmVenta`/`handleDeleteVenta` se simplifican — la
  lógica de stock/cobros/comisiones se va a la función Postgres; el cliente solo
  llama la RPC y recarga estado. Las alertas de "garantías por vencer" (Resumen/
  Agenda) leen el vencimiento por item.

## Migración de datos

`supabase/migracion-ventas-relacional.sql` (7ª en el orden de prod, después de
cuenta-corriente):

1. Crear `venta_items` + RLS + las funciones `crear_venta`/`borrar_venta`.
2. Alterar `ventas`: agregar `canje_equipo_id`, `total_usd`, `total_costo`;
   mantener por ahora las columnas viejas para el backfill.
3. **Backfill**: por cada venta existente, crear sus `venta_items` — de las que
   tienen `lineas` JSON, un item por línea (mapeando los campos); de las viejas
   sin `lineas`, un item desde `equipo_label`/`imei`/`categoria`/`usd`/`costo` y
   la garantía de la cabecera. Setear `total_usd`/`total_costo`.
4. Dejar `lineas` y las columnas viejas de garantía un release como respaldo; una
   migración posterior las dropea una vez verificado en producción.

Orden de migraciones en prod (al mergear): garantia → multitenant →
stock-global → comisiones → comision-capital → cuenta-corriente →
**ventas-relacional**.

## Verificación (QA con agent-browser en dev)

1. Venta contado de un teléfono ajeno con comisión → una fila en `ventas`, una
   en `venta_items` con `equipo_id` correcto (no null), stock del equipo
   `vendido`, comisión en cuenta corriente, garantía del equipo cargada.
2. Venta multi-equipo (teléfono + accesorio + regalo) → varios `venta_items`,
   stock de cada uno actualizado (accesorio descuenta cantidad), `total_usd` sin
   contar el regalo.
3. Venta en cuotas → `cobros` generados dentro de la misma transacción.
4. Garantías distintas por equipo en la misma venta → cada item con su
   `garantia_vence`; la alerta de "por vencer" las toma por equipo.
5. Convertir una reserva de equipo ajeno → item con `equipo_id`, comisión y
   garantía correctas.
6. Borrar una venta → stock restaurado, cobros y comisiones borrados, items
   caen por CASCADE, todo atómico.
7. Fallo simulado a mitad (ej. monto de cuota < US$1) → **rollback total**, no
   queda venta ni items ni stock tocado.
8. Consulta SQL: `select equipo_id from venta_items` → sin nulls (salvo líneas
   sin equipo del stock, que no deberían existir en la práctica).
9. Regresión: Ganancias (desglose por categoría e ingresos), Historial (multi-
   producto), Clientes (compras), VentaDetalle — todo sigue mostrando bien.
