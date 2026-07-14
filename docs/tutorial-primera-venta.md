# Tu primera venta en cuotas, de punta a punta

Vas a cargar un iPhone al stock, venderlo financiado en 6 cuotas y ver las cuotas aparecer en la agenda de cobros. Al terminar entendés el ciclo completo del sistema: stock → venta → agenda → cliente.

## Qué necesitás

La app corriendo (producción o [local](como-hacer.md#cómo-correr-la-app-en-tu-compu)) y tu usuario logueado.

## Paso 1: Cargá el equipo al stock

En **Stock → + Agregar producto** completá: categoría iPhone, modelo, capacidad y color (los combos ya traen los valores comunes), condición, IMEI (15 dígitos — el sistema valida el dígito de control y rechaza duplicados) y precio de venta en USD. El costo es opcional pero te da el margen en cada pantalla.

**Resultado visible:** el equipo aparece primero en la tabla con estado "Disponible".

## Paso 2: Registrá la venta

Tocá **+ Registrar venta** (botón del header). El flujo tiene 5 pasos numerados:

1. **Equipos** — buscá tu iPhone y tocá "+ Agregar". Lo ves sumarse al carrito con su precio.
2. **Cliente** — buscá por nombre o DNI, o "+ Registrar como cliente nuevo" (solo el nombre es obligatorio).
3. **Modalidad** — elegí "En cuotas", 6 cuotas, y si te dan un adelanto cargalo en "Anticipo (USD)". El comprobante de la derecha muestra el plan: si la última cuota difiere por redondeo, lo aclara.
4. **Método** — el medio de pago del anticipo/saldo. Si entregan un equipo usado, activá "Plan canje" y cargalo: entra solo al stock al confirmar.
5. **Vendedor** — tu número (opcional).

**Resultado visible:** al tocar "Confirmar venta" salta el toast "Venta registrada con éxito" y te lleva al Historial, con tu venta arriba de todo.

## Paso 3: Mirá la agenda

Andá a **Agenda**. Las 6 cuotas están en el calendario, una por mes (barras azules = pendientes). Tocá un día con cuota y usá **"Marcar cobrada"** cuando el cliente pague — la barra se pone verde.

## Paso 4: Mirá al cliente

En **Clientes**, tu cliente ahora muestra el saldo pendiente en USD. Entrá a su ficha: está la compra con su garantía (3 meses), el plan de cuotas con la barra de progreso y la próxima fecha de cobro. Si alguna cuota se vence sin cobrar, el cliente pasa a "En mora" automáticamente.

## Qué construiste

Un ciclo de venta completo: el equipo salió del stock, la venta quedó en el historial con su TC congelado, las cuotas viven en la agenda y el cliente tiene su cuenta corriente al día. Seguí con la [referencia](referencia.md) para los detalles de cada regla, o [cómo hacer](como-hacer.md) para tareas puntuales como adjuntar garantías.
