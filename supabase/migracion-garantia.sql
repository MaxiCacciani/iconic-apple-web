-- ============================================================================
-- Migración: garantía elegible por venta
-- Ejecutar en el SQL Editor de AMBOS proyectos (producción y iconic-dev).
--
-- garantia_vence: fecha explícita de vencimiento elegida al vender
--   (las ventas nuevas con "3 meses" también la guardan calculada).
-- sin_garantia: la venta se hizo sin garantía.
-- Ventas viejas (ambas null/false): siguen usando el fallback de 3 meses.
-- ============================================================================

alter table public.ventas
  add column if not exists garantia_vence date,
  add column if not exists sin_garantia boolean not null default false;

notify pgrst, 'reload schema';
