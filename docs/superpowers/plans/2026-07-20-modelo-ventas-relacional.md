# Modelo de ventas relacional y ACID — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el JSON `lineas` desnormalizado por un modelo relacional (`ventas` cabecera + `venta_items` con FK a `equipos`), con creación y borrado de ventas atómicos (ACID) vía funciones Postgres.

**Architecture:** Tabla nueva `venta_items` (FK a `ventas` CASCADE, FK a `equipos` RESTRICT) con foto del equipo + garantía por equipo. Dos funciones Postgres (`crear_venta`, `borrar_venta`) que son **escritores atómicos tontos**: reciben del cliente los arrays ya calculados (items, cobros, comisiones, stock) y hacen los inserts/updates en una sola transacción. La lógica de negocio queda en JS.

**Tech Stack:** React 19 + Vite, Supabase (PostgreSQL + RLS + RPC), supabase-js.

## Global Constraints

- Trabajar en la rama `dev`; commits atómicos por tarea (CLAUDE.md).
- Montos en USD; UI en español con tildes.
- **No hay suite de tests**: la verificación por tarea es `npm run build` (falla en sintaxis/imports) + QA con agent-browser contra `npm run dev` (regla de CLAUDE.md). No introducir un test runner.
- **No puedo correr SQL contra Supabase** (MCP sin auth, PAT revocado): las migraciones las escribo y las corre Maxi en el SQL editor de iconic-dev. La QA de comportamiento espera a que la migración esté corrida (gate en Task 1).
- Tolerancia de despliegue: el front puede llegar a prod antes que la migración. `fetchVentas` con embedding falla si `venta_items` no existe → capturar y degradar; `createVenta`/`deleteVenta` fallan con mensaje claro si las funciones no existen.
- Orden de migraciones en prod al mergear: garantia → multitenant → stock-global → comisiones → comision-capital → cuenta-corriente → **ventas-relacional**.
- Credenciales dev QA: chacho@iconic.com / maxi (Iconic) y elialcober@neg.com / maxi (TuIphoneVcp).

## Estructura de archivos

- Create: `supabase/migracion-ventas-relacional.sql` — tabla `venta_items`, RLS, alter `ventas`, funciones `crear_venta`/`borrar_venta`, backfill.
- Modify: `src/lib/db.js` — builders puros + `createVenta`/`deleteVenta`/`fetchVentas`/`rowToVenta`; eliminar `ventaToRow`.
- Modify: `src/App.jsx` — simplificar `handleConfirmVenta`/`handleDeleteVenta`; derivación de compras.
- Modify: `src/screens/Venta.jsx` — garantía por equipo en el carrito; `buildLineas` por ítem.
- Modify: `src/screens/Reservas.jsx` — la línea del ConvertirModal ya lleva garantía por ítem (verificar).
- Modify: `src/components/VentaDetalleModal.jsx` — mostrar garantía por equipo.
- Modify: `docs/referencia.md` — modelo de datos.

---

### Task 1: Migración SQL (tablas, funciones, backfill)

**Files:**
- Create: `supabase/migracion-ventas-relacional.sql`

**Interfaces:**
- Produces: tabla `public.venta_items`; columnas nuevas en `ventas` (`canje_equipo_id`, `total_usd`, `total_costo`); funciones `crear_venta(payload jsonb) returns uuid` y `borrar_venta(p_venta_id uuid, p_stock_restores jsonb) returns void`. Task 2 asume este esquema en dev.

- [ ] **Step 1: Escribir la migración completa**

```sql
-- ============================================================================
-- Migración: modelo de ventas relacional y ACID
-- Ejecutar en el SQL Editor (iconic-dev ahora; producción al deployar).
-- Orden en prod: garantia → multitenant → stock-global → comisiones →
-- comision-capital → cuenta-corriente → ventas-relacional (esta).
-- ============================================================================

-- 1) Columnas nuevas en la cabecera (las viejas quedan para el backfill)
alter table public.ventas add column if not exists canje_equipo_id uuid references public.equipos(id);
alter table public.ventas add column if not exists total_usd numeric;
alter table public.ventas add column if not exists total_costo numeric;

-- 2) Items de venta: un renglón por equipo, con FK real y foto al vender
create table if not exists public.venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  equipo_id uuid references public.equipos(id) on delete restrict,
  cantidad int not null default 1,
  precio_usd numeric not null default 0,
  costo numeric,
  es_regalo boolean not null default false,
  comision numeric not null default 0,
  negocio_duenio uuid,
  equipo_label text not null,
  imei text,
  categoria text,
  garantia_vence date,
  sin_garantia boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists venta_items_venta_id_idx on public.venta_items(venta_id);
create index if not exists venta_items_equipo_id_idx on public.venta_items(equipo_id);

alter table public.venta_items enable row level security;
drop policy if exists "items_de_mi_venta" on public.venta_items;
create policy "items_de_mi_venta" on public.venta_items for all to authenticated
  using (exists (select 1 from public.ventas v where v.id = venta_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.ventas v where v.id = venta_id and v.owner_id = auth.uid()));

-- 3) Creación atómica. Escritor tonto: el cliente manda todo ya calculado.
--    payload = { venta:{...}, items:[...], cobros:[...], comisiones:[...],
--                stock_updates:[{equipo_id,estado,cantidad}], canje_equipo:{...}|null }
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
    insert into public.equipos (categoria, modelo, cap, color, cond, bat, imei, usd, costo, proveedor, estado, cantidad, defectos)
    values (ce->>'categoria', ce->>'modelo', ce->>'cap', ce->>'color', ce->>'cond',
            nullif(ce->>'bat','')::int, ce->>'imei', nullif(ce->>'usd','')::numeric,
            nullif(ce->>'costo','')::numeric, ce->>'proveedor', coalesce(ce->>'estado','disponible'),
            coalesce(nullif(ce->>'cantidad','')::int, 1), ce->>'defectos')
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

-- 4) Borrado atómico. El cliente pasa los valores de stock a restaurar.
create or replace function public.borrar_venta(p_venta_id uuid, p_stock_restores jsonb default '[]'::jsonb)
returns void
language plpgsql
security invoker
as $$
begin
  update public.equipos e
     set estado = sr->>'estado',
         cantidad = coalesce((sr->>'cantidad')::int, e.cantidad)
  from jsonb_array_elements(p_stock_restores) sr
  where e.id = (sr->>'equipo_id')::uuid;

  delete from public.comisiones where venta_id = p_venta_id;
  delete from public.cobros where venta_id = p_venta_id;
  delete from public.ventas where id = p_venta_id;  -- venta_items caen por CASCADE
end;
$$;

grant execute on function public.crear_venta(jsonb) to authenticated;
grant execute on function public.borrar_venta(uuid, jsonb) to authenticated;

-- 5) Backfill de ventas existentes → venta_items
--    a) ventas con lineas JSON: un item por línea
insert into public.venta_items (venta_id, equipo_id, cantidad, precio_usd, costo, es_regalo, comision, negocio_duenio, equipo_label, imei, categoria, garantia_vence, sin_garantia)
select v.id,
       nullif(l->>'equipoId','')::uuid,
       coalesce((l->>'cantidad')::int, 1),
       coalesce((l->>'usd')::numeric, 0),
       nullif(l->>'costo','')::numeric,
       coalesce((l->>'esRegalo')::boolean, false),
       coalesce((l->>'comision')::numeric, 0),
       nullif(l->>'negocioDuenio','')::uuid,
       coalesce(l->>'equipo', v.equipo_label, 'Equipo'),
       coalesce(l->>'imei', v.imei),
       coalesce(l->>'categoria', v.categoria),
       v.garantia_vence,
       coalesce(v.sin_garantia, false)
from public.ventas v
cross join lateral jsonb_array_elements(v.lineas) l
where v.lineas is not null and jsonb_typeof(v.lineas) = 'array' and jsonb_array_length(v.lineas) > 0
  and not exists (select 1 from public.venta_items vi where vi.venta_id = v.id);

--    b) ventas viejas sin lineas: un item desde la cabecera
insert into public.venta_items (venta_id, equipo_id, cantidad, precio_usd, costo, es_regalo, comision, negocio_duenio, equipo_label, imei, categoria, garantia_vence, sin_garantia)
select v.id, v.equipo_id, 1, coalesce(v.usd, 0), v.costo, false, 0, null,
       coalesce(v.equipo_label, 'Equipo'), v.imei, v.categoria, v.garantia_vence, coalesce(v.sin_garantia, false)
from public.ventas v
where (v.lineas is null or jsonb_typeof(v.lineas) <> 'array' or jsonb_array_length(v.lineas) = 0)
  and not exists (select 1 from public.venta_items vi where vi.venta_id = v.id);

--    c) totales
update public.ventas v set
  total_usd = coalesce((select sum(case when vi.es_regalo then 0 else vi.precio_usd * vi.cantidad end) from public.venta_items vi where vi.venta_id = v.id), 0),
  total_costo = coalesce((select sum(vi.costo * vi.cantidad) from public.venta_items vi where vi.venta_id = v.id), 0);

notify pgrst, 'reload schema';

-- Verificación rápida (correr aparte tras la migración):
--   select count(*) from public.ventas;                    -- N ventas
--   select count(*) from public.venta_items;               -- >= N items
--   select count(*) from public.venta_items where equipo_id is null;  -- solo ventas pre-lineas
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migracion-ventas-relacional.sql
git commit -m "feat(sql): modelo de ventas relacional (venta_items + funciones ACID + backfill)"
```

- [ ] **Step 3: GATE — Maxi corre la migración en el SQL editor de iconic-dev**

Las tareas 2-6 (código) avanzan sin la BD, pero la QA de la Task 7 la necesita. Pasarle el SQL y esperar confirmación antes de la Task 7. Correr también las 3 líneas de verificación.

---

### Task 2: Capa de datos (`src/lib/db.js`)

**Files:**
- Modify: `src/lib/db.js` — sección VENTAS (líneas ~308-339), `rowToVenta` (~63-102), eliminar `ventaToRow` (~188-217)

**Interfaces:**
- Consumes: helpers existentes `localDateISO()`, `addMonthsISO()`, `isoToLabel()`, `isoToNum()`, `esPhone` (si existe; si no, se recibe por parámetro — ver abajo).
- Produces (usadas por App.jsx en Task 3):
  - `buildCobrosRows(v) → rows[]` (sin venta_id) — lógica de cuotas.
  - `buildComisionesRows(v, miNegocioId) → rows[]` (sin venta_id).
  - `buildStockUpdates(v, equipos) → [{equipo_id, estado, cantidad}]`.
  - `buildStockRestores(venta, equipos) → [{equipo_id, estado, cantidad}]`.
  - `createVenta(v, equipos, miNegocioId) → Promise<Venta>` (llama rpc `crear_venta`, re-fetch).
  - `deleteVenta(id, stockRestores) → Promise<void>` (llama rpc `borrar_venta`).
  - `fetchVentas()` con embedding; `rowToVenta` arma `lineas` desde `venta_items`.

- [ ] **Step 1: `rowToVenta` lee `venta_items`**

Reemplazar el `return { ... }` de `rowToVenta` (líneas ~75-101) por:

```js
  const items = Array.isArray(r.venta_items) ? r.venta_items : [];
  const lineas = items.map(it => ({
    equipoId: it.equipo_id || null,
    equipo: it.equipo_label,
    imei: it.imei || '',
    categoria: it.categoria || '',
    usd: Number(it.precio_usd),
    costo: it.costo != null ? Number(it.costo) : null,
    cantidad: it.cantidad || 1,
    esRegalo: !!it.es_regalo,
    comision: Number(it.comision || 0),
    negocioDuenio: it.negocio_duenio || null,
    garantiaVence: it.garantia_vence || null,
    sinGarantia: !!it.sin_garantia,
  }));
  // Garantía a nivel venta para vistas de cabecera: el vencimiento más lejano
  // de los equipos con garantía; sin garantía si ningún equipo la tiene.
  const conGarantia = lineas.filter(l => !l.sinGarantia && l.garantiaVence);
  const garantiaVence = conGarantia.length
    ? conGarantia.map(l => l.garantiaVence).sort().slice(-1)[0]
    : null;
  return {
    id: r.id,
    fechaLabel: isoToLabel(r.fecha),
    fechaNum: isoToNum(r.fecha),
    equipo: lineas[0]?.equipo || r.equipo_label || 'Equipo',
    imei: lineas[0]?.imei || '',
    categoria: lineas[0]?.categoria || '',
    cliente: r.cliente_nombre,
    clienteId: r.cliente_id || null,
    usd: r.total_usd != null ? Number(r.total_usd) : Number(r.usd || 0),
    costo: r.total_costo != null ? Number(r.total_costo) : (r.costo ? Number(r.costo) : null),
    tc: r.tc || 1400,
    modalidad: r.modalidad,
    cuotas: r.cuotas ?? null,
    anticipo: r.anticipo ?? null,
    metodo: normMetodo(r.metodo),
    cuotaMonto: r.cuota_monto ?? null,
    canje: r.canje || false,
    canjeEquipo: r.canje_equipo_id || null,
    canjeValor: r.canje_valor ?? null,
    garantiaUrl: r.garantia_url || null,
    garantiaNombre: r.garantia_nombre || null,
    garantiaVence,
    sinGarantia: conGarantia.length === 0,
    lineas,
    vendedorNumero: r.vendedor_numero ?? null,
  };
```

- [ ] **Step 2: `fetchVentas` con embedding + tolerancia**

Reemplazar `fetchVentas` (~310-317):

```js
export async function fetchVentas() {
  const { data, error } = await supabase
    .from('ventas')
    .select('*, venta_items(*)')
    .order('fecha', { ascending: false });
  if (error) {
    // Esquema sin migrar (deploy antes del SQL): degradar sin romper la carga
    if (/venta_items|schema cache|does not exist/i.test(error.message || '')) return [];
    throw error;
  }
  return data.map(rowToVenta);
}
```

- [ ] **Step 3: Builders puros**

Eliminar `ventaToRow` (~188-217) y `generateCobros` (mover su lógica acá). Agregar en la sección VENTAS:

```js
// Filas de cobros (sin venta_id — lo completa la función Postgres)
export function buildCobrosRows(v) {
  if (v.modalidad !== 'cuotas' || !v.cuotas) return [];
  if (!v.cuotaMonto || v.cuotaMonto < 1) {
    throw new Error('el monto por cuota es menor a US$ 1 — revisá el plan de pago');
  }
  const today = localDateISO();
  const { primeraCuotaHoy, cuotas, cuotaMonto } = v;
  const totalFinanciado = Math.max(0,
    Number(v.usd || 0) - Number(v.anticipo || 0)
    - (v.canje && v.canjeValor ? Number(v.canjeValor) : 0));
  const ajusteUltima = Math.round((totalFinanciado - cuotaMonto * (cuotas - 1)) * 100) / 100;
  const montoUltima = totalFinanciado > 0 ? Math.max(0, ajusteUltima) : cuotaMonto;
  return Array.from({ length: cuotas }, (_, i) => {
    const esHoy = primeraCuotaHoy && i === 0;
    return {
      cliente_id: v.clienteId ?? null,
      cliente_nombre: v.cliente,
      equipo_label: v.equipo,
      monto: i === cuotas - 1 ? montoUltima : cuotaMonto,
      fecha: esHoy ? today : addMonthsISO(today, primeraCuotaHoy ? i : i + 1),
      estado: esHoy ? 'cobrada' : 'pendiente',
      numero_cuota: i + 1,
      total_cuotas: cuotas,
    };
  });
}

// Filas de comisiones para equipos ajenos (sin venta_id)
export function buildComisionesRows(v, miNegocioId) {
  if (!miNegocioId) return [];
  const rows = [];
  for (const l of (v.lineas || [])) {
    if (!l.equipoId) continue;
    const duenio = l.negocioDuenio || null;
    if (!duenio || duenio === miNegocioId) continue;
    const capital = Math.round((l.costo || 0) * (l.cantidad || 1) * 100) / 100;
    const comision = l.comision || 0;
    if (capital > 0 || comision > 0) {
      rows.push({
        equipo_label: l.equipo || v.equipo || 'Equipo',
        monto: comision, capital, porcentaje: 0,
        negocio_duenio: duenio, negocio_vendedor: miNegocioId,
        fecha: localDateISO(),
      });
    }
  }
  return rows;
}

// Estado final del stock por equipo (valores absolutos)
export function buildStockUpdates(v, equipos) {
  const qtyPorEquipo = new Map();
  for (const l of (v.lineas || [])) {
    if (!l.equipoId) continue;
    qtyPorEquipo.set(l.equipoId, (qtyPorEquipo.get(l.equipoId) || 0) + (l.cantidad || 1));
  }
  const updates = [];
  for (const [eid, qty] of qtyPorEquipo) {
    const eq = equipos.find(e => e.id === eid);
    if (!eq) continue;
    if (!esPhone(eq.categoria) && eq.cantidad > qty) {
      updates.push({ equipo_id: eid, estado: 'disponible', cantidad: eq.cantidad - qty });
    } else {
      updates.push({ equipo_id: eid, estado: 'vendido', cantidad: eq.cantidad });
    }
  }
  return updates;
}

// Stock a restaurar al borrar una venta (valores absolutos)
export function buildStockRestores(venta, equipos) {
  const qtyPorEquipo = new Map();
  for (const l of (venta.lineas || [])) {
    if (!l.equipoId) continue;
    qtyPorEquipo.set(l.equipoId, (qtyPorEquipo.get(l.equipoId) || 0) + (l.cantidad || 1));
  }
  const restores = [];
  for (const [eid, qty] of qtyPorEquipo) {
    const eq = equipos.find(e => e.id === eid);
    if (!eq) continue;
    if (esPhone(eq.categoria)) {
      restores.push({ equipo_id: eid, estado: 'disponible', cantidad: eq.cantidad });
    } else {
      restores.push({ equipo_id: eid, estado: 'disponible', cantidad: eq.cantidad + qty });
    }
  }
  return restores;
}
```

`esPhone` vive en App.jsx hoy. Moverlo a `src/lib/utils.js` (o importarlo de donde esté) y reexportarlo, o duplicar la definición mínima en db.js. **Verificar en Step de build** que `esPhone` esté importado en db.js. Definición actual (buscar con `grep -n "esPhone" src/`): usa `getCatDef(cat).enTabPropia`. Si `getCatDef` no está disponible en db.js, importar de `../data/data.js`:

```js
import { getCatDef } from '../data/data.js';
const esPhone = (cat) => getCatDef(cat).enTabPropia;
```

- [ ] **Step 4: `createVenta` y `deleteVenta` vía RPC**

Reemplazar `createVenta` (~319-330) y `generateCobros`/`deleteVenta` viejos:

```js
export async function createVenta(v, equipos = [], miNegocioId = null) {
  const items = (v.lineas || []).map(l => ({
    equipo_id: l.equipoId || null,
    cantidad: l.cantidad || 1,
    precio_usd: l.usd || 0,
    costo: l.costo ?? null,
    es_regalo: !!l.esRegalo,
    comision: l.comision || 0,
    negocio_duenio: l.negocioDuenio || null,
    equipo_label: l.equipo || v.equipo || 'Equipo',
    imei: l.imei || null,
    categoria: l.categoria || null,
    garantia_vence: l.garantiaVence || null,
    sin_garantia: l.sinGarantia ?? true,
  }));
  const totalUsd = items.reduce((a, it) => a + (it.es_regalo ? 0 : it.precio_usd * it.cantidad), 0);
  const totalCosto = items.reduce((a, it) => a + (it.costo != null ? it.costo * it.cantidad : 0), 0);
  const payload = {
    venta: {
      cliente_id: v.clienteId || null,
      cliente_nombre: v.cliente,
      fecha: localDateISO(),
      tc: v.tc ?? 1400,
      modalidad: v.modalidad,
      cuotas: v.cuotas ?? null,
      anticipo: v.anticipo ?? null,
      cuota_monto: v.cuotaMonto ?? null,
      metodo: v.metodo || null,
      canje: v.canje || false,
      canje_valor: v.canjeValor ?? null,
      garantia_url: v.garantiaUrl || null,
      garantia_nombre: v.garantiaNombre || null,
      total_usd: Math.round(totalUsd * 100) / 100,
      total_costo: Math.round(totalCosto * 100) / 100,
      vendedor_numero: v.vendedorNumero ?? null,
    },
    items,
    cobros: buildCobrosRows(v),
    comisiones: buildComisionesRows(v, miNegocioId),
    stock_updates: buildStockUpdates(v, equipos),
    canje_equipo: v.canjeEquipoData || null,
  };
  const { data: newId, error } = await supabase.rpc('crear_venta', { payload });
  if (error) throw error;
  const { data, error: e2 } = await supabase
    .from('ventas').select('*, venta_items(*)').eq('id', newId).single();
  if (e2) throw e2;
  return rowToVenta(data);
}

export async function deleteVenta(id, stockRestores = []) {
  const { error } = await supabase.rpc('borrar_venta', { p_venta_id: id, p_stock_restores: stockRestores });
  if (error) throw error;
}
```

- [ ] **Step 5: Build + commit**

Run: `npm run build` → Expected: `✓ built`. Corregir imports (`esPhone`/`getCatDef`, `addMonthsISO`) si el build se queja.

```bash
git add src/lib/db.js
git commit -m "feat(db): capa de datos relacional para ventas (RPC ACID + builders)"
```

---

### Task 3: `App.jsx` — handlers simplificados

**Files:**
- Modify: `src/App.jsx` — `handleConfirmVenta` (~213-315), `handleDeleteVenta` (~371-407), derivación de compras (~555-590)

**Interfaces:**
- Consumes: `db.createVenta(v, equipos, miNegocioId)`, `db.deleteVenta(id, stockRestores)`, `db.buildStockRestores`, `db.fetchVentas/fetchCobros/fetchComisiones/fetchEquipos`.

- [ ] **Step 1: `handleConfirmVenta` atómico**

Reemplazar todo el cuerpo de `handleConfirmVenta` (213-315) por:

```js
  const handleConfirmVenta = async (ventaData) => {
    try {
      const miNegocio = session?.user?.app_metadata?.negocio_id || null;
      await db.createVenta(ventaData, equipos, miNegocio);
      // Recargar los slices afectados desde la BD (la venta ya es atómica)
      const [vts, eqs, cbs, cms] = await Promise.all([
        db.fetchVentas(),
        db.fetchEquipos(),
        db.fetchCobros(),
        db.fetchComisiones().catch(() => comisiones),
      ]);
      setVentas(vts);
      setEquipos(eqs);
      setCobros(cbs);
      setComisiones(cms);
      showToast('Venta registrada con éxito');
      setTimeout(() => go('ventas'), 300);
    } catch (e) {
      showToast('Error al registrar venta: ' + e.message);
    }
  };
```

- [ ] **Step 2: `handleDeleteVenta` atómico**

Reemplazar `handleDeleteVenta` (371-407) por:

```js
  const handleDeleteVenta = async (id) => {
    try {
      const venta = ventas.find(v => v.id === id);
      const stockRestores = venta ? db.buildStockRestores(venta, equipos) : [];
      await db.deleteVenta(id, stockRestores);
      const [vts, eqs, cbs] = await Promise.all([db.fetchVentas(), db.fetchEquipos(), db.fetchCobros()]);
      setVentas(vts);
      setEquipos(eqs);
      setCobros(cbs);
      setComisiones(prev => prev.filter(c => c.ventaId !== id));
      showToast('Venta eliminada');
    } catch (e) {
      showToast('Error al eliminar venta: ' + e.message);
    }
  };
```

- [ ] **Step 3: Verificar la derivación de compras**

En la derivación de compras del cliente (~555-590) se usa `v.lineas?.[0]?.equipoId` y `v.lineas`. Como `rowToVenta` ahora arma `lineas` desde `venta_items`, sigue funcionando sin cambios. Verificar leyendo esas líneas que no referencien campos que ya no existan (`v.equipoId` a nivel venta). Si aparece `v.equipoId`, cambiar a `v.lineas?.[0]?.equipoId`.

- [ ] **Step 4: Build + commit**

Run: `npm run build` → Expected: `✓ built`

```bash
git add src/App.jsx
git commit -m "feat: creación y borrado de ventas atómicos vía RPC en App"
```

---

### Task 4: `Venta.jsx` — garantía por equipo

**Files:**
- Modify: `src/screens/Venta.jsx` — estado (~240-241), `buildLineas` (~426-439), `buildVentaData` (~442-456), validación (~403-406), carrito item (~527-540), sección garantía venta-level (~780-800), comprobante (~901-902)

**Interfaces:**
- Produces: cada línea de `buildLineas` incluye `garantiaVence`/`sinGarantia` por equipo. `buildVentaData` ya no manda garantía a nivel venta.

- [ ] **Step 1: Estado por ítem, no por venta**

Quitar el estado venta-level `garantiaTipo`/`garantiaFecha` (líneas 240-241). La garantía pasa a vivir en cada ítem del carrito. Agregar un helper de fecha 3 meses cerca del top del componente:

```js
  const iso3meses = () => { const d = new Date(); d.setMonth(d.getMonth() + 3); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const updateGarantia = (carritoId, tipo, fecha) =>
    setCarrito(prev => prev.map(c => c.carritoId === carritoId ? { ...c, garantiaTipo: tipo, garantiaFecha: fecha ?? c.garantiaFecha } : c));
```

Al agregar un equipo al carrito, inicializar `garantiaTipo: '3m'`, `garantiaFecha: ''` (buscar donde se hace `setCarrito(prev => [...prev, { ... }])` y sumar esos campos).

- [ ] **Step 2: `buildLineas` con garantía por ítem**

Reemplazar `buildLineas` (426-439):

```js
  const buildLineas = () => carrito.map(e => {
    const esEquipo = getCatDef(e.categoria).enTabPropia;
    const tipo = e.garantiaTipo || '3m';
    const sinGarantia = !esEquipo || tipo === 'sin';
    const garantiaVence = !esEquipo ? null
      : tipo === 'fecha' ? (e.garantiaFecha || null)
      : tipo === '3m' ? iso3meses()
      : null;
    return {
      equipoId: e.id,
      equipo: [e.modelo, e.cap, e.color].filter(Boolean).join(' · '),
      imei: e.imei || '',
      categoria: e.categoria,
      usd: e.esRegalo ? 0 : effPrecio(e),
      costo: e.costo || null,
      cantidad: e.cantidadVenta || 1,
      esRegalo: e.esRegalo || false,
      negocioDuenio: e.negocioId || null,
      comision: esAjeno(e) && !e.esRegalo ? (parseFloat(e.comisionVenta) || 0) : 0,
      garantiaVence,
      sinGarantia,
    };
  });
```

(Los nombres de campo del ítem del carrito — `e.id`, `e.modelo`/`e.cap`/`e.color`, `effPrecio(e)`, `e.costo`, `e.imei`, `e.cantidadVenta`, `e.negocioId`, `e.comisionVenta` — son los que usa el `buildLineas` actual, verificados. `effPrecio` ya está definido en el componente.)

- [ ] **Step 3: `buildVentaData` sin garantía venta-level**

En `buildVentaData` (442-456) quitar las claves `sinGarantia` y `garantiaVence` (ahora van por línea). El resto queda igual (cliente, modalidad, cuotas, metodo, canje, lineas, etc.).

- [ ] **Step 4: Selector de garantía por equipo en el carrito**

En el render del ítem del carrito (~cerca de la caja de comisión, línea 527), para cada ítem que sea equipo (`getCatDef(e.categoria).enTabPropia`), agregar un selector compacto:

```jsx
                    {getCatDef(e.categoria).enTabPropia && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11.5, color: '#828a94' }}>Garantía:</span>
                        {[['3m', '3 meses'], ['fecha', 'Hasta fecha'], ['sin', 'Sin garantía']].map(([k, label]) => (
                          <button key={k} onClick={() => updateGarantia(e.carritoId, k)}
                            style={{ padding: '3px 10px', borderRadius: 14, fontSize: 11.5, cursor: 'pointer', border: 'none', fontFamily: "'Hanken Grotesk', sans-serif", background: (e.garantiaTipo || '3m') === k ? '#74a8d6' : 'rgba(231,238,246,0.06)', color: (e.garantiaTipo || '3m') === k ? '#14171c' : '#828a94', fontWeight: (e.garantiaTipo || '3m') === k ? 600 : 400 }}>
                            {label}
                          </button>
                        ))}
                        {(e.garantiaTipo || '3m') === 'fecha' && (
                          <input type="date" value={e.garantiaFecha || ''} onChange={ev => updateGarantia(e.carritoId, 'fecha', ev.target.value)}
                            style={{ padding: '4px 9px', borderRadius: 8, background: '#1e2228', border: '1px solid rgba(231,238,246,0.12)', color: '#eef2f7', fontSize: 12, colorScheme: 'dark' }} />
                        )}
                      </div>
                    )}
```

- [ ] **Step 5: Validación por ítem**

Reemplazar la validación de garantía (403-406) por un loop sobre los ítems equipo con tipo 'fecha':

```js
    for (const e of carrito) {
      if (getCatDef(e.categoria).enTabPropia && e.garantiaTipo === 'fecha') {
        if (!e.garantiaFecha) { errs.push(`Elegí hasta qué fecha cubre la garantía de ${e.modelo || 'un equipo'}.`); continue; }
        const [gy, gm, gd] = e.garantiaFecha.split('-').map(Number);
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        if (new Date(gy, gm - 1, gd) <= hoy) errs.push(`La garantía de ${e.modelo || 'un equipo'} debe ser una fecha futura.`);
      }
    }
```

(Adaptar `errs` al nombre del array de errores existente en esa función.)

- [ ] **Step 6: Comprobante**

Quitar la sección de garantía venta-level del comprobante (~780-800) y la línea resumen (901-902). Opcional: mostrar "Garantía por equipo" como nota; no es obligatorio para la venta.

- [ ] **Step 7: Build + commit**

Run: `npm run build` → Expected: `✓ built`

```bash
git add src/screens/Venta.jsx
git commit -m "feat: garantía por equipo en el carrito de venta"
```

---

### Task 5: `Reservas.jsx` — garantía por ítem en la conversión

**Files:**
- Modify: `src/screens/Reservas.jsx` — `handleConfirm` del ConvertirModal (~48-88)

**Interfaces:**
- Consumes: la línea que arma ya incluye `garantiaVence`/`sinGarantia`; verificar que queden en la LÍNEA (no a nivel venta).

- [ ] **Step 1: Mover garantía a la línea**

En el objeto `lineas: equipoRef ? [{ ... }]` (líneas ~75-86) agregar, si no están:

```js
        garantiaVence: null,
        sinGarantia: equipoRef ? !getCatDef(equipoRef.categoria).enTabPropia : true,
```

Y quitar `sinGarantia`/`garantiaVence` del nivel venta del `onConfirm` (líneas ~66-67) si siguen ahí, porque `createVenta` ahora lee la garantía por línea. (Una reserva convertida usa el default: equipos con 3 meses no aplica —la reserva no elige garantía—; se registra `sinGarantia` para accesorios y sin vencimiento para equipos, o se puede setear 3m con `iso3meses`. Decisión: equipos convertidos → 3 meses por defecto: `sinGarantia: false, garantiaVence: iso3meses()` cuando `getCatDef(...).enTabPropia`.)

Concretamente, en la línea:

```js
        garantiaVence: equipoRef && getCatDef(equipoRef.categoria).enTabPropia ? iso3meses() : null,
        sinGarantia: !(equipoRef && getCatDef(equipoRef.categoria).enTabPropia),
```

Agregar el helper `iso3meses` en Reservas.jsx (igual que en Venta.jsx).

- [ ] **Step 2: Build + commit**

Run: `npm run build` → Expected: `✓ built`

```bash
git add src/screens/Reservas.jsx
git commit -m "feat: garantía por equipo al convertir una reserva"
```

---

### Task 6: Detalle y alertas de garantía

**Files:**
- Modify: `src/components/VentaDetalleModal.jsx` — mostrar garantía por equipo (~18+)
- Verify: `src/screens/Ganancias.jsx`, `src/screens/Ventas.jsx`, `src/screens/Clientes.jsx`, `src/screens/Resumen.jsx` (alerta garantías por vencer)

**Interfaces:**
- Consumes: `venta.lineas` (cada línea con `garantiaVence`/`sinGarantia`).

- [ ] **Step 1: VentaDetalleModal muestra garantía por equipo**

En VentaDetalleModal, donde hoy muestra la garantía a nivel venta (fila "Garantía"), si hay `lineas`, listar por equipo: para cada línea que sea equipo, mostrar `{linea.equipo}: {linea.sinGarantia ? 'sin garantía' : 'hasta ' + fecha}`. Mantener el fallback a `venta.garantiaVence`/`sinGarantia` para ventas de una sola línea. Código:

```jsx
      {lineas ? (
        lineas.filter(l => !l.sinGarantia && l.garantiaVence).map((l, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
            <span style={{ color: '#828a94' }}>Garantía · {l.equipo}</span>
            <span style={{ color: '#eef2f7' }}>hasta {String(l.garantiaVence).split('-').reverse().join('/')}</span>
          </div>
        ))
      ) : (venta.sinGarantia || venta.garantiaVence) && (
        /* fila de garantía existente a nivel venta */ null
      )}
```

(Integrar con el markup real del modal; mantener el bloque existente como fallback.)

- [ ] **Step 2: Alerta "garantías por vencer" por equipo**

Buscar en Resumen.jsx (o donde se calculen las alertas) el cómputo de garantías por vencer (`grep -n "garantiaVence\|por vencer\|garant" src/screens/Resumen.jsx src/App.jsx`). Si itera `ventas` usando `v.garantiaVence` (nivel venta), cambiar a iterar `v.lineas` y usar `l.garantiaVence` de cada equipo con garantía. Cada equipo próximo a vencer es una alerta.

- [ ] **Step 3: Verificar consumidores de lineas**

`grep -n "\.lineas" src/screens/Ganancias.jsx src/screens/Ventas.jsx src/screens/Clientes.jsx`. Confirmar que cada uso funciona con la nueva forma (Ganancias usa `l.categoria/usd/costo/cantidad/esRegalo`; Ventas/Clientes usan `lineas.length`). No requieren cambios porque `rowToVenta` reproduce esos campos. Anotar en el commit.

- [ ] **Step 4: Build + commit**

Run: `npm run build` → Expected: `✓ built`

```bash
git add src/components/VentaDetalleModal.jsx src/screens/Resumen.jsx
git commit -m "feat: mostrar y alertar garantía por equipo"
```

---

### Task 7: QA con agent-browser, docs y push

**Files:**
- Modify: `docs/referencia.md` (modelo de datos + reglas de venta)

**Interfaces:**
- Consumes: BD dev migrada (gate de Task 1), dev server, usuarios de prueba.

- [ ] **Step 1: Confirmar que la migración corrió en iconic-dev** (gate de Task 1). Correr las 3 consultas de verificación (count ventas, count venta_items, count equipo_id null).

- [ ] **Step 2: QA con agent-browser** (`npm run dev`, `agent-browser open http://localhost:5173`). Escenarios del spec:
  1. Venta contado de un teléfono ajeno con comisión → SQL: `select equipo_id, comision, garantia_vence from venta_items order by created_at desc limit 1` (equipo_id NO null, comisión y garantía correctas); stock del equipo `vendido`; comisión en cuenta corriente.
  2. Venta multi-equipo (teléfono + accesorio + regalo) → varios `venta_items`; stock de cada uno actualizado; `total_usd` sin el regalo.
  3. Venta en cuotas → `cobros` generados (misma transacción).
  4. Dos equipos con garantías distintas en una venta → cada `venta_items` con su `garantia_vence`; alerta "por vencer" por equipo.
  5. Convertir reserva de equipo ajeno → item con `equipo_id`, comisión y garantía.
  6. Borrar una venta → stock restaurado, cobros/comisiones borrados, items por CASCADE.
  7. **Rollback**: forzar fallo (ej. cuotas con monto < US$1) → error, y verificar por SQL que NO quedó venta ni items ni stock tocado.
  8. Regresión: Ganancias (desglose por categoría e ingresos), Historial (multi-producto), Clientes (compras), VentaDetalle.

  Notas agent-browser: clicks por `textContent` (refs stale); inputs React necesitan `fill` (no native-setter en `eval`); leer screenshots con Read.

- [ ] **Step 3: Actualizar `docs/referencia.md`**

En la tabla de modelo de datos, reemplazar la fila de `ventas` y agregar `venta_items`:

```markdown
| `ventas` | fecha, cliente_id, cliente_nombre, tc, modalidad, cuotas, anticipo, cuota_monto, metodo, canje, canje_valor, canje_equipo_id, garantia_url, total_usd, total_costo, vendedor_numero |
| `venta_items` | venta_id (FK), equipo_id (FK), cantidad, precio_usd, costo, es_regalo, comision, negocio_duenio, equipo_label/imei/categoria (foto), garantia_vence, sin_garantia |
```

En Reglas de negocio, actualizar la de garantía: ahora es **por equipo** (cada teléfono elige 3 meses / fecha / sin garantía en el carrito), no una por venta. Y agregar una línea: la venta se crea de forma **atómica** (función Postgres `crear_venta`): venta + items + stock + cobros + comisiones en una transacción; si algo falla, no queda nada a medias.

- [ ] **Step 4: Commit de docs, push y cierre**

```bash
git add docs/referencia.md
git commit -m "docs: modelo de ventas relacional y garantía por equipo"
git push
```

Recordar al mergear a master: correr `migracion-ventas-relacional.sql` en producción (última en el orden). Tras verificar en prod, una migración posterior puede dropear `ventas.lineas` y las columnas viejas (`equipo_label`, `imei`, `categoria`, `usd`, `costo`, `garantia_vence`, `sin_garantia`, `equipo_id`, `canje_equipo`).
