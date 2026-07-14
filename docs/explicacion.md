# Por qué el sistema funciona así

Las decisiones de diseño detrás del código. Para el *qué*, ver [referencia.md](referencia.md).

## Por qué los precios viven en USD y los pesos son solo equivalencia

**El problema:** en Argentina el peso se devalúa rápido. Si el sistema guardara precios en ARS, un iPhone cargado a $1.400.000 hoy estaría "barato" en tres meses sin que nadie tocara nada, y las cuotas pactadas perderían valor mes a mes contra el costo de reposición del negocio (que es en dólares).

**La solución:** todo lo que representa valor (precios, cuotas, señas, canjes) se guarda en USD. El peso aparece solo como equivalencia calculada con el TC del día, que el vendedor actualiza desde Resumen. Cada venta congela el TC vigente (columna `tc`) para que el historial refleje lo que realmente se cobró.

**Trade-off:** el cliente paga en pesos, así que el vendedor convierte mentalmente (o con la equivalencia en pantalla) al cobrar. Se aceptó porque proteger el valor del negocio pesa más que ahorrar una conversión.

## Por qué las señas se cargan en USD

Una seña dejada en pesos pierde valor si el dólar sube entre la reserva y la compra. Cargándola ya convertida al TC del día en que se cobra, el cliente "congela" lo que pagó y el negocio no discute cotizaciones viejas al convertir la reserva. El formulario muestra la equivalencia en pesos como ayuda para el mostrador.

## Por qué el saldo del cliente se calcula desde los cobros

**El problema:** un campo "saldo" guardado en la tabla clientes se desactualiza: cada cobro, venta eliminada o cuota nueva lo dejaría mentiroso.

**La solución:** el saldo, el plan de cuotas y el estado "En mora" se derivan en tiempo real de los cobros no cobrados de las ventas del cliente ([App.jsx](../src/App.jsx), `clientesConCompras`). Nunca hay que "sincronizar" nada — si la agenda está bien, el cliente está bien. Lo mismo con las cuotas vencidas: una cuota `pendiente` con fecha pasada se muestra como `vencida` al leerla, sin escribir en la BD.

**Trade-off:** un poco más de cálculo en el navegador en cada render. Irrelevante para el volumen de un local.

## Por qué la última cuota es distinta a las demás

US$ 1.000 en 6 cuotas da 166,67 — imposible de cobrar. Redondear a 167 cobra US$ 1.002. La solución: 5 cuotas de 167 y una última de 165 que absorbe la diferencia. El comprobante lo dice explícito para que el cliente firme sabiendo.

## Por qué RLS exige usuario autenticado

La `anon key` de Supabase viaja dentro del JavaScript del sitio: cualquiera que abra las herramientas de desarrollador la puede copiar. Sin políticas RLS estrictas, esa llave permitía leer clientes y borrar ventas sin login (se comprobó en julio 2026). Las políticas de [supabase/policies.sql](../supabase/policies.sql) cierran todo al rol `authenticated`; la app no cambia porque siempre se opera con sesión iniciada. El bucket de garantías mantiene lectura pública para que los links compartidos sigan funcionando, pero solo un usuario logueado puede subir o borrar archivos.

## Por qué cancelar una reserva no la borra

Cancelar marca `estado='cancelada'` y libera el equipo; el registro queda como historial (se filtra en "Canceladas"). Borrar de verdad es una acción separada ("Eliminar registro"). Separar ambas evita perder el rastro de cuánta gente reserva y no compra.

## Por qué packs y vendedores viven en localStorage

Son configuración personal del mostrador, no datos del negocio: perderlos no rompe nada y no ameritan tabla propia ni round-trips. Si algún día se necesitan multi-dispositivo, se migran a Supabase.
