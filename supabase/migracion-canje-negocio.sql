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
