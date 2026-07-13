-- ============================================================================
-- Políticas RLS — gestion-iconic
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → pegar y Run
--
-- Objetivo: solo usuarios AUTENTICADOS pueden leer/escribir las tablas.
-- La anon key (pública, viaja en el JS del sitio) deja de poder operar.
-- La app no cambia: siempre operás con sesión iniciada.
-- ============================================================================

-- 1) Eliminar TODAS las políticas existentes de las tablas de la app
do $$
declare pol record;
begin
  for pol in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('clientes','cobros','equipos','reclamos','reservas','ventas')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- 2) Activar RLS y permitir todo SOLO a usuarios autenticados
alter table public.clientes enable row level security;
create policy "solo_autenticados" on public.clientes
  for all to authenticated using (true) with check (true);

alter table public.cobros enable row level security;
create policy "solo_autenticados" on public.cobros
  for all to authenticated using (true) with check (true);

alter table public.equipos enable row level security;
create policy "solo_autenticados" on public.equipos
  for all to authenticated using (true) with check (true);

alter table public.reclamos enable row level security;
create policy "solo_autenticados" on public.reclamos
  for all to authenticated using (true) with check (true);

alter table public.reservas enable row level security;
create policy "solo_autenticados" on public.reservas
  for all to authenticated using (true) with check (true);

alter table public.ventas enable row level security;
create policy "solo_autenticados" on public.ventas
  for all to authenticated using (true) with check (true);

-- 3) Storage (bucket "garantias"):
--    - Subir / reemplazar / borrar archivos: solo autenticados.
--    - La LECTURA pública no se toca: el bucket es público y los links
--      existentes de garantías siguen funcionando.
-- Solo se tocan políticas que refieran al bucket garantias — las de otros
-- buckets (si existieran) quedan intactas.
do $$
declare pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (policyname ilike '%garantias%'
           or coalesce(qual, '') ilike '%garantias%'
           or coalesce(with_check, '') ilike '%garantias%')
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;

create policy "garantias_lectura_publica" on storage.objects
  for select using (bucket_id = 'garantias');

create policy "garantias_subir_autenticados" on storage.objects
  for insert to authenticated with check (bucket_id = 'garantias');

create policy "garantias_actualizar_autenticados" on storage.objects
  for update to authenticated using (bucket_id = 'garantias') with check (bucket_id = 'garantias');

create policy "garantias_borrar_autenticados" on storage.objects
  for delete to authenticated using (bucket_id = 'garantias');
