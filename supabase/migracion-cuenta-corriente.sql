-- ============================================================================
-- Migración: cuenta corriente entre socios (pagos + movimientos manuales)
-- Ejecutar en el SQL Editor (iconic-dev ahora; producción al deployar).
-- Orden en prod: garantia → multitenant → stock-global → comisiones →
-- comision-capital → cuenta-corriente (esta).
-- ============================================================================

-- Las comisiones ahora se pueden saldar. Marca/desmarca SOLO el acreedor
-- (negocio_duenio: el que cobra capital + comisión).
alter table public.comisiones add column if not exists pagado boolean not null default false;
alter table public.comisiones add column if not exists pagado_en date;

drop policy if exists "update_acreedor" on public.comisiones;
create policy "update_acreedor" on public.comisiones for update to authenticated
  using (negocio_duenio = public.negocio_actual())
  with check (negocio_duenio = public.negocio_actual());

-- Movimientos manuales entre socios: deudas que nacen fuera de la app
-- (ej. "Calefactor 50/50"). No entran en ganancias, solo en la deuda.
create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  concepto text not null,
  monto numeric not null check (monto > 0),
  negocio_deudor uuid not null references public.negocios(id) on delete cascade,
  negocio_acreedor uuid not null references public.negocios(id) on delete cascade,
  creado_por uuid not null default public.negocio_actual(),
  pagado boolean not null default false,
  pagado_en date,
  created_at timestamptz default now(),
  check (negocio_deudor <> negocio_acreedor)
);

alter table public.movimientos enable row level security;

-- Lo ven las dos partes
drop policy if exists "partes" on public.movimientos;
create policy "partes" on public.movimientos for select to authenticated
  using (public.negocio_actual() in (negocio_deudor, negocio_acreedor));

-- Crea cualquiera de las partes, en cualquier dirección (me debe / le debo)
drop policy if exists "insert_parte" on public.movimientos;
create policy "insert_parte" on public.movimientos for insert to authenticated
  with check (creado_por = public.negocio_actual()
              and public.negocio_actual() in (negocio_deudor, negocio_acreedor));

-- Marcar/desmarcar pago: solo el acreedor
drop policy if exists "update_acreedor" on public.movimientos;
create policy "update_acreedor" on public.movimientos for update to authenticated
  using (negocio_acreedor = public.negocio_actual())
  with check (negocio_acreedor = public.negocio_actual());

-- Borrar: solo quien lo creó (la UI solo lo ofrece en manuales pendientes)
drop policy if exists "delete_creador" on public.movimientos;
create policy "delete_creador" on public.movimientos for delete to authenticated
  using (creado_por = public.negocio_actual());

notify pgrst, 'reload schema';
