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
