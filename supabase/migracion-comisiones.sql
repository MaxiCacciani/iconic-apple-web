-- ============================================================================
-- Migración: comisiones entre negocios por venta de stock ajeno
-- Ejecutar en el SQL Editor (iconic-dev ahora; producción al deployar).
--
-- Si un negocio vende un equipo cargado por otro negocio, se genera una
-- comisión = comision_pct del dueño × precio de venta. Informativa (sin
-- estados de pago). Visible para ambos negocios involucrados.
-- ============================================================================

-- % que cobra cada negocio cuando otros venden sus equipos (editable por SQL)
alter table public.negocios add column if not exists comision_pct numeric not null default 10;

create table if not exists public.comisiones (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid,
  equipo_label text not null,
  monto numeric not null,
  porcentaje numeric not null,
  negocio_duenio uuid not null references public.negocios(id) on delete cascade,
  negocio_vendedor uuid not null references public.negocios(id) on delete cascade,
  fecha date not null default current_date,
  created_at timestamptz default now()
);

alter table public.comisiones enable row level security;
drop policy if exists "partes" on public.comisiones;
create policy "partes" on public.comisiones for select to authenticated
  using (public.negocio_actual() in (negocio_duenio, negocio_vendedor));
drop policy if exists "insert_vendedor" on public.comisiones;
create policy "insert_vendedor" on public.comisiones for insert to authenticated
  with check (negocio_vendedor = public.negocio_actual());
drop policy if exists "delete_vendedor" on public.comisiones;
create policy "delete_vendedor" on public.comisiones for delete to authenticated
  using (negocio_vendedor = public.negocio_actual());

-- Los negocios deben poder leerse entre sí (nombre y %) para calcular y
-- mostrar comisiones. Reemplaza la política de solo-mi-negocio.
drop policy if exists "mi_negocio" on public.negocios;
drop policy if exists "negocios_visibles" on public.negocios;
create policy "negocios_visibles" on public.negocios for select to authenticated
  using (true);

notify pgrst, 'reload schema';

-- Cambiar el % de un negocio:
--   update public.negocios set comision_pct = 12 where nombre = 'Iconic';
