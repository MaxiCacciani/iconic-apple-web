-- ============================================================================
-- Migración: bucket de garantías privado + signed URLs
-- Ejecutar en el SQL Editor (iconic-dev ahora; producción al deployar junto
-- con el front — es un cambio acoplado).
--
-- Remedia: comprobantes de garantía (PII de clientes) enumerables sin auth en
-- un bucket público.
-- ============================================================================

-- 1) Bucket privado: deja de servir objetos por URL directa
update storage.buckets set public = false where id = 'garantias';

-- 2) Lectura solo para autenticados (anon pierde select → no puede listar ni
--    firmar). Las políticas de subir/actualizar/borrar (auth-only) no se tocan.
drop policy if exists "garantias_lectura_publica" on storage.objects;
create policy "garantias_lectura_autenticados" on storage.objects
  for select to authenticated using (bucket_id = 'garantias');

-- 3) Convertir los garantia_url ya cargados: URL pública -> path.
--    Idempotente: solo filas que contienen '/garantias/'. Los paths son
--    {ventaId}[_{n}].{ext} (UUID + extensión), sin caracteres a decodificar.
update public.ventas
set garantia_url = (
  select string_agg(
    case when u like '%/garantias/%' then split_part(u, '/garantias/', 2) else u end,
    '|' order by ord)
  from unnest(string_to_array(garantia_url, '|')) with ordinality as t(u, ord)
)
where garantia_url is not null and garantia_url like '%/garantias/%';

notify pgrst, 'reload schema';

-- Verificación (correr aparte tras la migración):
--   select public from storage.buckets where id = 'garantias';        -- false
--   select garantia_url from public.ventas where garantia_url is not null limit 5;  -- paths, sin http
