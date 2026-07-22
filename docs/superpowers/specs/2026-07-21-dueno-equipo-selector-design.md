# Selector de negocio dueño al cargar stock y en plan canje — diseño

Fecha: 2026-07-21 · Estado: aprobado por Maxi

## Problema

El stock es **global**: todos los negocios ven y operan el mismo inventario. Pero
el dueño de cada equipo (`equipos.negocio_id`) se asigna solo, con el default
`negocio_actual()` de la BD — o sea, **siempre queda a nombre de quien lo carga**.

Si Maxi carga un equipo que en realidad es del otro negocio, queda mal asignado,
y eso desvirtúa la comisión y el capital que se calculan al venderlo (van al
"dueño" equivocado en la cuenta corriente). Lo mismo con un equipo que entra por
**plan canje**: hoy se crea siempre a nombre de quien registra la venta.

## Objetivo

Poder **elegir el negocio dueño** al cargar un equipo al stock y al ingresar uno
por plan canje, con el negocio propio como default y la opción de elegir el otro.

## Decisiones tomadas

| Decisión | Elección |
|---|---|
| Cambiar el dueño de un equipo ya cargado | **Sí, salvo si está vendido.** Editable mientras esté disponible o reservado; bloqueado una vez vendido, porque su comisión y capital ya se asentaron en la cuenta corriente con el dueño viejo y no se recalculan. |
| Quién puede asignar | Cualquier usuario, a cualquier negocio. La RLS de `equipos` ya es abierta (`using(true) with check(true)`) y son socios. |
| Ver el dueño en el stock | Sí: hoy no se muestra en ningún lado, así que sin esto no se podría verificar lo asignado. |
| Bug del canje (mostraba el UUID) | **Fuera de alcance** — ya lo arregló Maxi a mano (embed por FK en `fetchVentas` + etiqueta en `rowToVenta`). |

## Alcance

### 1. Selector de dueño en el formulario de stock

`StockModal` (`src/screens/Stock.jsx`, sirve para agregar y editar) suma un campo
**Dueño**: un desplegable con todos los negocios.

- Al **agregar**: precargado con el negocio del usuario (`miNegocioId`).
- Al **editar**: precargado con el dueño actual del equipo.
- **Deshabilitado si `initial.estado === 'vendido'`**, con una nota corta al lado
  explicando que no se puede cambiar porque su comisión ya está registrada.

`Stock` recibe dos props nuevas desde `App.jsx`: `negocios` y `miNegocioId`
(mismo patrón que ya usan `Venta` y `Reservas`).

### 2. Ver el dueño en la lista de stock

Bajo el modelo de cada equipo, una línea sutil **"de {negocio}"** únicamente
cuando el equipo pertenece a **otro** negocio (mismo patrón que el carrito de
venta, que ya muestra "Equipo de X"). Los propios no llevan nada, para no
ensuciar la lista.

### 3. Selector de dueño en el plan canje

La sección de canje de `src/screens/Venta.jsx` suma el mismo desplegable, con el
negocio propio por defecto. El valor viaja en `canjeEquipoData.negocioId`.

### 4. Capa de datos

- `equipoToRow` (`src/lib/db.js`) escribe `negocio_id` **solo cuando viene
  definido** (`...(e.negocioId ? { negocio_id: e.negocioId } : {})`). Es
  importante que sea condicional: `updateEquipo` se llama desde varios lados con
  objetos parciales (cambios de estado en reservas), y escribir `null` borraría
  el dueño.
- `updateEquipo` ya usa `equipoToRow`, así que la ruta de edición queda cubierta
  sin cambios adicionales.
- `rowToEquipo` ya mapea `negocioId`; no cambia.

### 5. Base de datos

Migración nueva `supabase/migracion-canje-negocio.sql`: un `create or replace`
de la función `crear_venta` para que el insert del equipo de canje use el
negocio del payload, con fallback al actual:

```sql
coalesce(nullif(ce->>'negocio_id','')::uuid, public.negocio_actual())
```

**No toca tablas ni datos** — solo reemplaza la función. Va después de
`ventas-relacional` en el orden de producción.

## Fuera de alcance

- **No** se recalculan comisiones ni capital de ventas ya registradas si se
  cambia el dueño de un equipo (por eso el bloqueo en los vendidos).
- **No** se restringe quién puede asignar a qué negocio.
- El bug del canje que mostraba el UUID: ya resuelto por Maxi fuera de este
  trabajo.

## Verificación (QA con agent-browser en dev)

1. Cargar un equipo nuevo dejando el dueño por defecto → queda a nombre del
   negocio propio; en la lista no aparece la línea "de …".
2. Cargar un equipo eligiendo **el otro negocio** → en la lista aparece
   "de {otro negocio}"; desde el otro usuario se ve como propio.
3. Vender ese equipo desde el negocio que **no** es el dueño → el carrito lo
   marca como ajeno y la comisión/capital van al negocio correcto en la cuenta
   corriente.
4. Editar un equipo **disponible** y cambiarle el dueño → se guarda y la lista
   lo refleja.
5. Abrir un equipo **vendido** → el selector de dueño está deshabilitado con su
   nota.
6. Registrar una venta con **plan canje** eligiendo el otro negocio como dueño →
   el equipo entra al stock a nombre de ese negocio.
7. Registrar una venta con canje **sin tocar** el selector → el equipo queda a
   nombre del negocio propio (comportamiento actual intacto).
8. Regresión: cambios de estado por reserva/cancelación no borran el
   `negocio_id` del equipo.
