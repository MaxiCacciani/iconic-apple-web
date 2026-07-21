# Referencia

Qué hace cada pieza del sistema. Datos exactos, sin rodeos. Para el *por qué*, ver [explicacion.md](explicacion.md).

## Pantallas

| Ruta | Pantalla | Qué muestra |
|------|----------|-------------|
| `/resumen` | Resumen | Ventas de hoy, stock disponible (unidades), reservas activas, cobros del mes, alertas (cuotas vencidas, garantías por vencer, baterías <80%) |
| `/stock` | Stock | Inventario con filtros por categoría/condición/estado. Alta/edición/borrado de productos |
| `/venta` | Registrar venta | Flujo de 5 pasos: equipos → cliente → modalidad → método/canje → vendedor |
| `/cobros` | Agenda | Calendario de cuotas y vencimientos de garantía. Marcar cuotas cobradas |
| `/reservas` | Reservas | Apartados con seña. Convertir en venta, cancelar o eliminar |
| `/clientes` | Clientes | Directorio con saldo pendiente y estado de mora. Detalle: compras, plan de cuotas, reclamos, reservas |
| `/ventas` | Historial | Todas las ventas con filtros, garantías adjuntas (PDF/JPG), costo/ganancia |

## Monedas

- **USD**: precios de equipos, cuotas, anticipos, señas, valores de canje. Formato `US$ 1.250` (`fUSD`).
- **ARS**: solo equivalencias informativas, calculadas con el TC del día. Formato `$ 1.850.000` (`fARS`).
- **TC del día**: editable desde Resumen, se guarda en `localStorage` (`tc_dia`) y se congela en cada venta (columna `tc`).

## Multi-usuario (negocios y usuarios)

- **Stock global**: todos los negocios operan el mismo inventario. Un equipo vendido o reservado por cualquiera queda bloqueado para todos.
- **Privado por usuario**: ventas, cobros, clientes, reservas, reclamos y ganancias — cada usuario ve solo lo suyo, incluso dentro del mismo negocio.
- **Reservas anónimas**: un equipo "Reservado" por otro usuario se ve bloqueado pero sin detalle de quién lo reservó (decisión de producto, jul 2026). Solo el dueño de la reserva puede convertirla o cancelarla.
- **Vendedores por negocio**: compartidos entre los usuarios del mismo negocio, únicos por negocio+número.
- **Comisiones entre negocios**: al vender un equipo cargado por otro negocio, el dueño cobra el **capital** (costo del equipo, automático) + una **comisión manual** que se tipea en el carrito por cada producto ajeno. Al **convertir una reserva** de un equipo ajeno también aparece ese cuadro de comisión. Los regalos ajenos devuelven capital pero no llevan comisión. Todo se acumula en la **cuenta corriente** de Ganancias: por negocio se ve el saldo del período y la deuda pendiente, y un modal muestra el detalle completo. Los pagos los confirma **solo el acreedor** (marcar/desmarcar línea por línea o "Saldar todo"). Las tarjetas "Comisiones cobradas/pagadas" y la ganancia neta cuentan **solo las comisiones efectivamente saldadas**, ubicadas en el período por su fecha de pago; la ganancia base de las ventas sigue siendo devengada. También se pueden cargar **movimientos manuales** en ambas direcciones para deudas fuera de la app (ej. "Calefactor 50/50") — cuentan en la deuda, no en las ganancias, y los borra solo quien los creó. Nota: las comisiones son a nivel negocio — con varios usuarios por negocio, la "ganancia neta" mezcla comisiones del negocio con ventas propias (limitación aceptada mientras haya un usuario por negocio).
- El `negocio_id` viaja firmado en el token (app_metadata); tras vincular un usuario a un negocio debe cerrar sesión y volver a entrar.
- Alta de negocios/usuarios: manual, instructivo al pie de [supabase/migracion-multitenant.sql](../supabase/migracion-multitenant.sql).

## Reglas de negocio

- **Garantía**: solo aplica a **equipos** (categorías con tab propia); los accesorios se registran sin garantía automáticamente. Es **por equipo**: cada teléfono del carrito elige la suya al vender — 3 meses (default), hasta una fecha específica, o "sin garantía". Se guarda en `venta_items.garantia_vence` / `sin_garantia` (una venta puede tener equipos con garantías distintas). El comprobante PDF (`ventas.garantia_url`) es uno por venta.
- **Venta atómica (ACID)**: registrar o borrar una venta corre en una sola transacción vía funciones Postgres (`crear_venta` / `borrar_venta`): venta + items + stock + cobros + comisiones, todo o nada. Si algo falla, no queda estado parcial. El cliente calcula los datos (cuotas, comisión, stock) y las funciones solo escriben.
- **Dueño del equipo**: el stock es global, así que cada equipo guarda a qué negocio pertenece (`equipos.negocio_id`). Se elige al cargarlo (por defecto, el negocio del usuario) y también al ingresar uno por plan canje. Se puede corregir mientras el equipo esté disponible o reservado; una vez **vendido queda bloqueado**, porque su comisión y capital ya se asentaron en la cuenta corriente con ese dueño. En la lista de Stock, los equipos de otro negocio muestran "de {negocio}".
- **Cuotas**: mínimo 2, máximo 60. Monto = redondeo de (precio − anticipo − canje) / cuotas. **La última cuota ajusta el redondeo** para que la suma dé exacta; el comprobante lo muestra cuando difiere. Monto mínimo por cuota: US$ 1.
- **Señas**: en USD (congelan su valor al TC del día en que se cobran). No pueden igualar o superar el precio.
- **Canje**: el equipo entregado entra al stock con `precio = costo = valor de canje`, proveedor "Plan canje". En cuotas, el canje se descuenta del monto a financiar.
- **Convertir reserva**: las cuotas se calculan sobre el saldo (precio − seña − anticipo extra); la seña queda registrada dentro del `anticipo` de la venta.
- **Regalos**: ítems del carrito a US$ 0 que no suman al total pero sí descuentan stock.
- **Stock de accesorios**: por cantidad (varias unidades por fila); los teléfonos son únicos por IMEI (validado con Luhn, 15 dígitos, sin duplicados).
- **Saldo del cliente**: suma de cuotas no cobradas de sus ventas. "En mora" = tiene al menos una cuota vencida. Las cuotas pendientes pasan a "vencida" automáticamente al pasar su fecha (calculado al leer, sin escribir en la BD).

## Modelo de datos (Supabase)

| Tabla | Campos clave |
|-------|--------------|
| `equipos` | categoria, modelo, cap, color, cond, bat*, imei, usd, costo, proveedor, estado (disponible/reservado/vendido), cantidad, defectos |
| `clientes` | nombre, dni, tel, loc, desde |
| `ventas` | fecha, cliente_id, cliente_nombre, tc, modalidad (contado/cuotas), cuotas, anticipo, cuota_monto, metodo, canje, canje_valor, canje_equipo_id, garantia_url, total_usd, total_costo, vendedor_numero |
| `venta_items` | venta_id (FK), equipo_id (FK), cantidad, precio_usd, costo, es_regalo, comision, negocio_duenio, equipo_label/imei/categoria (foto), garantia_vence, sin_garantia |
| `cobros` | venta_id, cliente_id, fecha, monto, estado (pendiente/vencida/cobrada), numero_cuota, total_cuotas |
| `reservas` | equipo_id, cliente_id, equipo_label, sena (USD), usd, estado (activa/convertida/cancelada) |
| `reclamos` | cliente_id, equipo_label, diagnostico, descripcion, fecha, estado, resolucion |
| `comisiones` | venta_id, equipo_label, monto (comisión), capital, negocio_duenio, negocio_vendedor, fecha, pagado, pagado_en |
| `movimientos` | fecha, concepto, monto, negocio_deudor, negocio_acreedor, creado_por, pagado, pagado_en |

\* `bat`: porcentaje de batería en teléfonos usados; cantidad de controles (0-4) en consolas.

**Storage**: bucket `garantias` — PDF (1, máx. 2 páginas) o JPG (máx. 2) por venta, lectura pública, escritura solo autenticados.

**Seguridad**: RLS activo en todas las tablas — solo el rol `authenticated` puede leer/escribir ([supabase/policies.sql](../supabase/policies.sql)).

## Datos en localStorage (no en la BD)

- `tc_dia` — TC del día
- `iconic_packs` — packs de venta (combos predefinidos)
- `iconic_vendedores` — números y nombres de vendedores

## Relacionado

- [Cómo operar el sistema](como-hacer.md) · [Tu primera venta](tutorial-primera-venta.md) · [Por qué funciona así](explicacion.md)
