-- ============================================================================
-- Migración: columnas faltantes en la tabla reclamos
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → pegar y Run
--
-- El código inserta estas columnas al registrar un reclamo; si alguna no
-- existe en la tabla, Supabase rechaza el insert ("Could not find the
-- 'fecha' column of 'reclamos' in the schema cache").
-- "add column if not exists" es inofensivo: solo agrega lo que falte.
-- ============================================================================

alter table public.reclamos
  add column if not exists equipo_label text,
  add column if not exists imei text,
  add column if not exists diagnostico text,
  add column if not exists descripcion text,
  add column if not exists fecha text,
  add column if not exists estado text default 'Pendiente',
  add column if not exists resolucion text;

-- Forzar la recarga del schema cache de la API (evita esperar el refresh)
notify pgrst, 'reload schema';
