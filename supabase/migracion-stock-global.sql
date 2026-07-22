-- ============================================================================
-- Migración: stock GLOBAL compartido entre todos los negocios
-- Ejecutar en el SQL Editor (en iconic-dev ahora; en producción al deployar,
-- DESPUÉS de migracion-multitenant.sql).
--
-- Todos los usuarios autenticados (de cualquier negocio) ven y operan el
-- mismo inventario. Ventas, clientes, cobros, reservas y reclamos siguen
-- siendo privados de cada usuario; vendedores siguen siendo por negocio.
-- ============================================================================

drop policy if exists "negocio" on public.equipos;
drop policy if exists "stock_global" on public.equipos;

create policy "stock_global" on public.equipos for all to authenticated
  using (true) with check (true);

notify pgrst, 'reload schema';
