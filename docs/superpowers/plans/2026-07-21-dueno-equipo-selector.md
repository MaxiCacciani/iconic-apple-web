# Selector de negocio dueño (stock y plan canje) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poder elegir el negocio dueño al cargar un equipo al stock y al ingresar uno por plan canje, con el negocio propio por defecto y opción de elegir el otro.

**Architecture:** El dueño ya vive en `equipos.negocio_id` (hoy lo llena solo el default `negocio_actual()`). Se expone como un campo en el formulario de stock y en la sección de canje; `equipoToRow` pasa a escribirlo cuando viene, y la función `crear_venta` lo usa al insertar el equipo de canje.

**Tech Stack:** React 19 + Vite, Supabase (PostgreSQL + RLS + RPC), supabase-js.

## Global Constraints

- Trabajar en la rama `dev`; commits atómicos por tarea (CLAUDE.md).
- UI en español con tildes; montos en USD.
- **No hay suite de tests**: verificación por tarea = `npm run build` + QA con agent-browser contra `npm run dev` (regla de CLAUDE.md).
- **No puedo correr SQL contra Supabase**: la migración la escribo y la corre Maxi en el SQL editor de iconic-dev (gate en Task 1).
- La RLS de `equipos` es `for all to authenticated using (true) with check (true)` — no hay que tocarla para asignar otro negocio.
- **`equipoToRow` debe escribir `negocio_id` SOLO cuando viene definido.** `updateEquipo` se llama con objetos parciales desde los cambios de estado de reservas; escribir `null` borraría el dueño.
- El bug del canje que mostraba el UUID ya lo arregló Maxi a mano en `db.js` (embed por FK en `fetchVentas` + etiqueta en `rowToVenta`). **No tocar esa parte.**
- Orden de migraciones en prod: … → cuenta-corriente → ventas-relacional → **canje-negocio** (esta).
- Credenciales dev QA: chacho@iconic.com / maxi (Iconic) y elialcober@neg.com / maxi (TuIphoneVcp).

## Estructura de archivos

- Create: `supabase/migracion-canje-negocio.sql` — `create or replace` de `crear_venta` usando el negocio del canje.
- Modify: `src/lib/db.js` — `equipoToRow` escribe `negocio_id` condicionalmente.
- Modify: `src/screens/Stock.jsx` — `FieldSelect` con `disabled`; campo Dueño en `StockModal`; línea "de {negocio}" en la lista; props nuevas.
- Modify: `src/App.jsx` — pasar `negocios` y `miNegocioId` a `<Stock>`.
- Modify: `src/screens/Venta.jsx` — estado y selector de dueño en la sección de canje; `canjeEquipoData.negocio_id`.
- Modify: `docs/referencia.md` — regla de negocio del dueño del equipo.

---

### Task 1: Migración SQL (crear_venta respeta el dueño del canje)

**Files:**
- Create: `supabase/migracion-canje-negocio.sql`

**Interfaces:**
- Produces: `crear_venta(payload jsonb)` reemplazada; el insert del equipo de canje ahora usa `coalesce(nullif(ce->>'negocio_id','')::uuid, public.negocio_actual())`. Task 4 depende de esto para que el dueño elegido persista.

- [ ] **Step 1: Escribir la migración**

Es un `create or replace` de la función completa (Postgres exige el cuerpo entero). Lo único que cambia respecto de `migracion-ventas-relacional.sql` es la columna `negocio_id` en el insert del equipo de canje.

```sql
-- ============================================================================
-- Migración: el equipo que entra por plan canje respeta el negocio elegido
-- Ejecutar en el SQL Editor (iconic-dev ahora; producción al deployar).
-- Orden en prod: … → cuenta-corriente → ventas-relacional → canje-negocio (esta).
--
-- Solo reemplaza la función crear_venta. NO toca tablas ni datos.
-- ============================================================================

create or replace function public.crear_venta(payload jsonb)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_id uuid;
  v jsonb := payload->'venta';
  ce jsonb := payload->'canje_equipo';
  v_canje_id uuid := null;
begin
  if ce is not null and jsonb_typeof(ce) = 'object' then
    insert into public.equipos (categoria, modelo, cap, color, cond, bat, imei, usd, costo, proveedor, estado, cantidad, defectos, negocio_id)
    values (ce->>'categoria', ce->>'modelo', ce->>'cap', ce->>'color', ce->>'cond',
            nullif(ce->>'bat','')::int, ce->>'imei', nullif(ce->>'usd','')::numeric,
            nullif(ce->>'costo','')::numeric, ce->>'proveedor', coalesce(ce->>'estado','disponible'),
            coalesce(nullif(ce->>'cantidad','')::int, 1), ce->>'defectos',
            coalesce(nullif(ce->>'negocio_id','')::uuid, public.negocio_actual()))
    returning id into v_canje_id;
  end if;

  insert into public.ventas (
    cliente_id, cliente_nombre, fecha, tc, modalidad, cuotas, anticipo, cuota_monto,
    metodo, canje, canje_valor, canje_equipo_id, garantia_url, garantia_nombre,
    total_usd, total_costo, vendedor_numero
  ) values (
    nullif(v->>'cliente_id','')::uuid, v->>'cliente_nombre', (v->>'fecha')::date,
    nullif(v->>'tc','')::numeric, v->>'modalidad', nullif(v->>'cuotas','')::int,
    nullif(v->>'anticipo','')::numeric, nullif(v->>'cuota_monto','')::numeric,
    v->>'metodo', coalesce((v->>'canje')::boolean, false), nullif(v->>'canje_valor','')::numeric,
    v_canje_id, v->>'garantia_url', v->>'garantia_nombre',
    nullif(v->>'total_usd','')::numeric, nullif(v->>'total_costo','')::numeric,
    nullif(v->>'vendedor_numero','')::int
  ) returning id into v_id;

  insert into public.venta_items (
    venta_id, equipo_id, cantidad, precio_usd, costo, es_regalo, comision,
    negocio_duenio, equipo_label, imei, categoria, garantia_vence, sin_garantia
  )
  select v_id, nullif(it->>'equipo_id','')::uuid, coalesce((it->>'cantidad')::int, 1),
         coalesce((it->>'precio_usd')::numeric, 0), nullif(it->>'costo','')::numeric,
         coalesce((it->>'es_regalo')::boolean, false), coalesce((it->>'comision')::numeric, 0),
         nullif(it->>'negocio_duenio','')::uuid, it->>'equipo_label', it->>'imei',
         it->>'categoria', nullif(it->>'garantia_vence','')::date,
         coalesce((it->>'sin_garantia')::boolean, false)
  from jsonb_array_elements(payload->'items') it;

  update public.equipos e
     set estado = su->>'estado',
         cantidad = coalesce((su->>'cantidad')::int, e.cantidad)
  from jsonb_array_elements(coalesce(payload->'stock_updates','[]'::jsonb)) su
  where e.id = (su->>'equipo_id')::uuid;

  insert into public.cobros (venta_id, cliente_id, cliente_nombre, equipo_label, monto, fecha, estado, numero_cuota, total_cuotas)
  select v_id, nullif(c->>'cliente_id','')::uuid, c->>'cliente_nombre', c->>'equipo_label',
         (c->>'monto')::numeric, (c->>'fecha')::date, c->>'estado',
         nullif(c->>'numero_cuota','')::int, nullif(c->>'total_cuotas','')::int
  from jsonb_array_elements(coalesce(payload->'cobros','[]'::jsonb)) c;

  insert into public.comisiones (venta_id, equipo_label, monto, capital, porcentaje, negocio_duenio, negocio_vendedor, fecha, pagado)
  select v_id, cm->>'equipo_label', (cm->>'monto')::numeric, coalesce((cm->>'capital')::numeric, 0),
         coalesce((cm->>'porcentaje')::numeric, 0), (cm->>'negocio_duenio')::uuid,
         (cm->>'negocio_vendedor')::uuid, (cm->>'fecha')::date, false
  from jsonb_array_elements(coalesce(payload->'comisiones','[]'::jsonb)) cm;

  return v_id;
end;
$$;

grant execute on function public.crear_venta(jsonb) to authenticated;

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migracion-canje-negocio.sql
git commit -m "feat(sql): el equipo de canje respeta el negocio dueño elegido"
```

- [ ] **Step 3: GATE — Maxi corre la migración en el SQL editor de iconic-dev**

Las tareas 2-4 (código) avanzan sin la BD, pero la QA del canje (Task 5) la necesita. Pasarle el SQL y esperar confirmación.

---

### Task 2: `equipoToRow` escribe el dueño

**Files:**
- Modify: `src/lib/db.js` — `equipoToRow`

**Interfaces:**
- Produces: `equipoToRow(e)` incluye `negocio_id` cuando `e.negocioId` está definido. Lo consumen `createEquipo` y `updateEquipo` (ambos ya lo usan), así que las Tasks 3 y 4 solo tienen que poner `negocioId` en el objeto.

- [ ] **Step 1: Escribir el mapeo condicional**

Reemplazar el `return` de `equipoToRow`:

```js
function equipoToRow(e) {
  return {
    categoria: e.categoria,
    modelo: e.modelo,
    cap: e.cap || null,
    color: e.color || null,
    cond: e.cond,
    bat: e.bat ?? null,
    imei: e.imei || null,
    usd: e.usd,
    estado: e.estado || 'disponible',
    cantidad: e.cantidad ?? 1,
    defectos: e.defectos || null,
    costo: e.costo ?? null,
    proveedor: e.proveedor || null,
    // Solo cuando viene definido: updateEquipo se llama con objetos parciales
    // (cambios de estado de reservas) y escribir null borraría el dueño
    ...(e.negocioId ? { negocio_id: e.negocioId } : {}),
  };
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/lib/db.js
git commit -m "feat(db): equipoToRow escribe el negocio dueño cuando viene definido"
```

Nota: `db.js` tiene cambios sin commitear de Maxi (el fix del canje). Si `git add src/lib/db.js` los arrastra, está bien — son suyos y ya están funcionando; mencionarlo en el mensaje final.

---

### Task 3: Selector de dueño en el stock (formulario + lista)

**Files:**
- Modify: `src/screens/Stock.jsx` — `FieldSelect`, `StockModal`, fila de la lista, firma de `Stock`
- Modify: `src/App.jsx` — render de `<Stock>`

**Interfaces:**
- Consumes: `equipoToRow` con `negocio_id` (Task 2).
- Produces: `Stock({ equipos, tc, negocios, miNegocioId, onAdd, onUpdate, onDelete })`; `StockModal({ initial, equipos, negocios, miNegocioId, onSave, onClose })`.

- [ ] **Step 1: `FieldSelect` acepta `disabled`**

```js
function FieldSelect({ value, onChange, options, disabled = false }) {
  return (
    <select value={value} onChange={onChange} disabled={disabled}
      style={{ ...selectStyle, opacity: disabled ? 0.55 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
```

- [ ] **Step 2: `StockModal` recibe negocios y arranca con el dueño correcto**

Firma y estado inicial:

```js
function StockModal({ initial, equipos, negocios = [], miNegocioId = null, onSave, onClose }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial
    ? { costo: '', proveedor: '', ...initial, bat: initial.bat ?? '', usd: initial.usd ?? '', defectos: initial.defectos ?? '' }
    : { ...EMPTY_FORM, negocioId: miNegocioId || '' }
  );
```

(Al editar, `initial` ya trae `negocioId` porque `rowToEquipo` lo mapea. `handleSave` hace `...form`, así que el campo viaja solo — no hay que tocarlo.)

- [ ] **Step 3: Campo Dueño en el formulario**

Insertar un bloque nuevo justo después del `<div style={{ ...row2, ...fieldWrap }}>` que contiene Proveedor y Estado (o sea, después de su `</div>` de cierre):

```jsx
      <div style={fieldWrap}>
        <FieldLabel>Dueño</FieldLabel>
        <FieldSelect
          value={form.negocioId || ''}
          onChange={e => set('negocioId', e.target.value)}
          disabled={isEdit && initial.estado === 'vendido'}
          options={negocios.map(n => [n.id, n.nombre])}
        />
        {isEdit && initial.estado === 'vendido' && (
          <div style={{ fontSize: 11.5, color: '#6a717b', marginTop: 5, lineHeight: 1.45 }}>
            No se puede cambiar: el equipo ya se vendió y su comisión quedó registrada con este dueño.
          </div>
        )}
      </div>
```

- [ ] **Step 4: Firma de `Stock` y paso de props al modal**

```js
export default function Stock({ equipos, tc, negocios = [], miNegocioId = null, onAdd, onUpdate, onDelete }) {
```

Y en el render del modal:

```jsx
        <StockModal
          initial={modal.mode === 'edit' ? modal.item : null}
          equipos={equipos}
          negocios={negocios}
          miNegocioId={miNegocioId}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
```

- [ ] **Step 5: Mostrar el dueño en la lista (solo equipos ajenos)**

Agregar el helper dentro de `Stock`, cerca del inicio del componente:

```js
  const nombreNegocio = (id) => negocios.find(n => n.id === id)?.nombre || 'otro negocio';
```

Y justo debajo de la línea del modelo en la fila (`<div style={{ fontSize: 14.5, fontWeight: 600, color: '#eef2f7' }}>{e.modelo}</div>`):

```jsx
                {e.negocioId && miNegocioId && e.negocioId !== miNegocioId && (
                  <div style={{ fontSize: 11.5, color: '#d9b876', marginTop: 2 }}>de {nombreNegocio(e.negocioId)}</div>
                )}
```

- [ ] **Step 6: Pasar las props desde `App.jsx`**

Reemplazar el render de `<Stock …>`:

```jsx
        {visited.has('stock')    && <div style={{ display: screen === 'stock'    ? 'block' : 'none' }}><Stock equipos={equipos} tc={tc} negocios={negocios} miNegocioId={session?.user?.app_metadata?.negocio_id || null} onAdd={addEquipo} onUpdate={updateEquipo} onDelete={deleteEquipo} /></div>}
```

- [ ] **Step 7: Build + commit**

Run: `npm run build` → Expected: `✓ built`

```bash
git add src/screens/Stock.jsx src/App.jsx
git commit -m "feat: elegir y ver el negocio dueño de cada equipo del stock"
```

---

### Task 4: Selector de dueño en el plan canje

**Files:**
- Modify: `src/screens/Venta.jsx` — estado del canje, `canjeEquipoData`, sección de canje, `resetForm`

**Interfaces:**
- Consumes: la migración de Task 1 (para que el dueño elegido persista) y las props `negocios`/`miNegocioId` que `Venta` **ya recibe**.
- Produces: `canjeEquipoData.negocio_id` (snake_case, igual que el resto de las claves de ese objeto, porque las lee la función SQL).

- [ ] **Step 1: Estado del dueño del canje**

Agregar junto a los demás `useState` del canje (después de `const [canjeValor, setCanjeValor] = useState('');`):

```js
  const [canjeNegocioId, setCanjeNegocioId] = useState(miNegocioId || '');
```

- [ ] **Step 2: Resetearlo con el formulario**

En `resetForm`, junto a `setCanjeValor('');`, agregar:

```js
    setCanjeNegocioId(miNegocioId || '');
```

- [ ] **Step 3: Mandar el dueño en `canjeEquipoData`**

En `buildVentaData`, dentro del objeto `canjeEquipoData`, agregar la clave (junto a `proveedor: 'Plan canje', estado: 'disponible', cantidad: 1,`):

```js
        negocio_id: canjeNegocioId || null,
```

- [ ] **Step 4: Selector en la sección de canje**

Dentro del bloque `{canje && (…)}`, después del `<div>` de Categoría y antes del de Modelo, insertar:

```jsx
                <div><span style={CANJE_LB}>Dueño</span>
                  <select value={canjeNegocioId} onChange={e => setCanjeNegocioId(e.target.value)} style={CANJE_SEL}>
                    {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                  </select>
                </div>
```

- [ ] **Step 5: Build + commit**

Run: `npm run build` → Expected: `✓ built`

```bash
git add src/screens/Venta.jsx
git commit -m "feat: elegir el negocio dueño del equipo que entra por canje"
```

---

### Task 5: QA con agent-browser, docs y push

**Files:**
- Modify: `docs/referencia.md`

**Interfaces:**
- Consumes: BD dev con la migración corrida (gate de Task 1), dev server, usuarios de prueba.

- [ ] **Step 1: Confirmar que la migración corrió en iconic-dev** (gate de Task 1).

- [ ] **Step 2: QA con agent-browser** (`npm run dev`, `agent-browser open http://localhost:5173`). Escenarios del spec:
  1. Cargar un equipo dejando el dueño por defecto → queda a nombre del negocio propio; en la lista **no** aparece la línea "de …".
  2. Cargar un equipo eligiendo **el otro negocio** → en la lista aparece "de {otro negocio}".
  3. Vender ese equipo desde el negocio que **no** es el dueño → el carrito lo marca como ajeno y la comisión/capital van al negocio correcto en la cuenta corriente.
  4. Editar un equipo **disponible** y cambiarle el dueño → se guarda y la lista lo refleja.
  5. Abrir un equipo **vendido** → el selector de Dueño está deshabilitado, con su nota.
  6. Venta con **plan canje** eligiendo el otro negocio → el equipo entra al stock a nombre de ese negocio (verificar en Stock que muestre "de …").
  7. Venta con canje **sin tocar** el selector → el equipo queda a nombre del negocio propio.
  8. **Regresión clave**: reservar y cancelar la reserva de un equipo → su dueño (`negocioId`) no se borra (esto valida el mapeo condicional de la Task 2).

  Notas agent-browser: clicks por `textContent` (los refs quedan stale); para inputs React usar `fill` (el native-setter por `eval` no dispara el onChange); leer los screenshots con Read.

- [ ] **Step 3: Actualizar `docs/referencia.md`**

En **Reglas de negocio**, agregar:

```markdown
- **Dueño del equipo**: el stock es global, así que cada equipo guarda a qué negocio pertenece (`equipos.negocio_id`). Se elige al cargarlo (por defecto, el negocio del usuario) y también al ingresar uno por plan canje. Se puede corregir mientras el equipo esté disponible o reservado; una vez **vendido queda bloqueado**, porque su comisión y capital ya se asentaron en la cuenta corriente con ese dueño. En la lista de Stock, los equipos de otro negocio muestran "de {negocio}".
```

- [ ] **Step 4: Commit de docs, push y cierre**

```bash
git add docs/referencia.md
git commit -m "docs: dueño del equipo configurable en stock y canje"
git push
```

Recordar al mergear a master: correr `migracion-canje-negocio.sql` en producción (última en el orden).
