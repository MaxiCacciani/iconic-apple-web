# Cuenta corriente entre socios — diseño

Fecha: 2026-07-16 · Estado: aprobado por Maxi

## Objetivo

Que la cuenta corriente entre negocios deje de ser solo informativa: los socios
deben poder **saldar deudas** (marcar líneas como pagadas, lo que las descuenta
del saldo) y **registrar movimientos que ocurren fuera de la app** (ej.: compran
un calefactor 50/50, paga todo el socio 1, y registra que el socio 2 le debe la
mitad).

## Decisiones tomadas

| Decisión | Elección |
|---|---|
| Quién marca una línea como pagada | **Solo el acreedor** (el negocio que cobra). También puede desmarcar si fue error. |
| Dirección de movimientos manuales | **Ambas**: cada socio puede cargar "me debe X" y "le debo X". |
| Ubicación | **Modal desde Ganancias** (botón "Ver cuenta corriente" por negocio). No se agrega ítem al menú. |
| Modelo de datos | **A**: flag `pagado` en `comisiones` + tabla nueva `movimientos` para lo manual. Sin refactor del libro existente. |

## Base de datos

Migración nueva: `supabase/migracion-cuenta-corriente.sql` (6ª en el orden de
prod: garantia → multitenant → stock-global → comisiones → comision-capital →
**cuenta-corriente**). Se corre a mano en el SQL editor (dev ahora, prod al
mergear).

### `comisiones` (alter)

- `pagado boolean not null default false`
- `pagado_en date` (null hasta que se marca)

### `movimientos` (nueva)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `fecha` | date | la elige el usuario, default hoy |
| `concepto` | text not null | ej. "Calefactor 50/50" |
| `monto` | numeric not null | USD, > 0 (check) |
| `negocio_deudor` | uuid ref negocios | quién debe |
| `negocio_acreedor` | uuid ref negocios | quién cobra |
| `creado_por` | uuid | negocio que cargó la fila, default `negocio_actual()` |
| `pagado` | boolean not null default false | |
| `pagado_en` | date | |
| `created_at` | timestamptz default now() | desempate de orden |

Check adicional: `negocio_deudor <> negocio_acreedor`.

### RLS

- **select**: `negocio_actual() in (negocio_deudor, negocio_acreedor)` — la ven
  las dos partes.
- **insert**: `creado_por = negocio_actual()` y el creador es una de las partes.
- **update**: solo `negocio_acreedor = negocio_actual()` (marcar/desmarcar pago).
  En `comisiones`, el acreedor es `negocio_duenio` — misma regla para el update
  de `pagado`/`pagado_en` ahí.
- **delete**: solo `creado_por = negocio_actual()` (la UI solo lo ofrece en
  movimientos manuales pendientes; las líneas de comisión no se borran desde la
  cuenta corriente — viven y mueren con su venta, como hasta ahora).

## Capa de datos (`src/lib/db.js`)

- `fetchMovimientos()` — tolera tabla inexistente (devuelve `[]` si el error es
  de schema cache / tabla faltante), para que el deploy no rompa si corre antes
  que la migración en prod.
- `createMovimiento(mov)`, `deleteMovimiento(id)`.
- `setMovimientoPagado(id, pagado)` y `setComisionPagada(id, pagado)` — setean
  `pagado_en = localDateISO()` al marcar, `null` al desmarcar.
- `fetchComisiones` ya mapea la fila completa; suma `pagado`/`pagadoEn` al mapeo
  con fallback `false`/`null` si la columna aún no existe.

## UI

### Bloque en Ganancias (se simplifica)

Por cada negocio contraparte, una fila con:

- **saldo del período** (igual que hoy: devengado entre fechas seleccionadas),
- **pendiente de pago**: neto de todo lo no pagado, histórico completo — la
  deuda real (comisiones no pagadas ± movimientos no pagados),
- botón **"Ver cuenta corriente"** que abre el modal.

El detalle expandible actual se elimina (lo reemplaza el modal).

### Modal "Cuenta corriente con {negocio}"

- **Encabezado**: saldo pendiente neto grande — "te debe US$ X" (verde) /
  "le debés US$ X" (rojo) / "al día" (gris).
- **Filtros**: Pendientes (default) · Pagadas · Todas.
- **Lista** (comisiones + movimientos de esa contraparte, fecha desc,
  `created_at` desc como desempate):
  - Comisión: fecha · "iPhone 13 128 · capital US$ 180 + com. US$ 25" ·
    dirección (a tu favor / en contra, con color).
  - Manual: fecha · concepto · monto · dirección.
  - Línea pendiente donde **mi negocio es el acreedor** → botón "Marcar pagada".
  - Línea pagada → "Pagada el {fecha}"; si soy el acreedor, acción "Desmarcar".
  - Movimiento manual pendiente creado por mi negocio → acción borrar.
- **"Saldar todo"**: marca como pagadas todas las líneas pendientes de esa
  contraparte donde soy acreedor (histórico completo, no solo el período).
  Pide confirmación e informa cuántas líneas saldó.
- **"+ Agregar movimiento"**: formulario con dirección (me debe / le debo),
  concepto (requerido), monto USD (> 0), fecha (default hoy).

## Reglas de negocio

1. **Ganancias no cambia**: comisiones cobradas/pagadas y ganancia neta siguen
   siendo lo *devengado* en el período, esté pagado o no. El pago solo afecta el
   saldo pendiente de la cuenta corriente.
2. Los movimientos manuales **no** entran en ganancias — son deuda entre socios,
   no resultado del negocio.
3. Capital y comisión de una venta se saldan **juntos** (son una sola fila).
4. Todo es a **nivel negocio** (como las comisiones): los dos usuarios de un
   mismo negocio ven y operan la misma cuenta corriente. Consistente con la
   limitación aceptada del modelo multi-usuario.
5. Si se elimina una venta, sus filas de comisión desaparecen como hasta ahora,
   estén pagadas o no (si estaba pendiente, la deuda baja — correcto, la venta
   ya no existe).
6. Los movimientos manuales **no se editan**: si hay un error de concepto o
   monto, el creador lo borra (mientras esté pendiente) y lo carga de nuevo.

## Verificación (QA con agent-browser en dev)

Con chacho@iconic.com (Iconic) y elialcober@neg.com (TuIphoneVcp):

1. eli vende un equipo de Iconic con comisión → la línea aparece pendiente en
   la cuenta corriente de ambos.
2. chacho (acreedor) ve "Marcar pagada"; eli (deudor) **no** ve el botón.
3. chacho marca pagada → el pendiente baja en las dos cuentas; la ganancia del
   período de ambos no cambia.
4. eli carga un manual "me debe" y otro "le debo" → direcciones y saldo neto
   correctos de los dos lados.
5. eli borra un manual propio pendiente; verifica que no puede borrar los del
   otro ni las comisiones.
6. "Saldar todo" con varias pendientes → todas pagadas, saldo en 0 (o solo la
   deuda inversa).
7. Filtros Pendientes/Pagadas/Todas y "Desmarcar" del acreedor.
