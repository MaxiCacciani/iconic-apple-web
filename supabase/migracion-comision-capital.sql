-- ============================================================================
-- Migración: comisión manual + capital del dueño (cuenta corriente)
-- Ejecutar en el SQL Editor (iconic-dev ahora; producción al deployar).
--
-- Nuevo modelo: al vender un equipo ajeno, el vendedor le debe al dueño el
-- CAPITAL (costo del equipo) + una COMISIÓN seteada a mano en la venta.
-- La suma de estos movimientos forma la cuenta corriente entre negocios.
-- ============================================================================

alter table public.comisiones
  add column if not exists capital numeric not null default 0;

notify pgrst, 'reload schema';
