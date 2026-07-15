-- ============================================================================
-- Migración: multi-tenancy (negocios + usuarios) y vendedores persistidos
-- Ejecutar en el SQL Editor (primero en iconic-dev; en producción al deployar).
--
-- Modelo: cada NEGOCIO comparte stock y vendedores entre sus usuarios;
-- clientes, ventas, cobros, reservas y reclamos son PRIVADOS de cada usuario.
-- El negocio_id viaja en app_metadata del JWT (el usuario no puede editarlo).
-- ============================================================================

-- 1) Tablas nuevas
create table if not exists public.negocios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz default now()
);

create table if not exists public.vendedores (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  numero integer not null,
  nombre text not null,
  created_at timestamptz default now(),
  unique (negocio_id, numero)
);

-- 2) Helper: negocio del usuario actual, leído del JWT (app_metadata)
create or replace function public.negocio_actual()
returns uuid language sql stable as
$$ select nullif(auth.jwt() -> 'app_metadata' ->> 'negocio_id', '')::uuid $$;

-- 2b) Default de tenant en vendedores (la función ya existe)
alter table public.vendedores alter column negocio_id set default public.negocio_actual();

-- 3) Columnas de tenant y dueño (los defaults evitan tocar el frontend)
alter table public.equipos   add column if not exists negocio_id uuid default public.negocio_actual();
alter table public.clientes  add column if not exists negocio_id uuid default public.negocio_actual(),
                             add column if not exists owner_id uuid default auth.uid();
alter table public.ventas    add column if not exists negocio_id uuid default public.negocio_actual(),
                             add column if not exists owner_id uuid default auth.uid();
alter table public.cobros    add column if not exists negocio_id uuid default public.negocio_actual(),
                             add column if not exists owner_id uuid default auth.uid();
alter table public.reservas  add column if not exists negocio_id uuid default public.negocio_actual(),
                             add column if not exists owner_id uuid default auth.uid();
alter table public.reclamos  add column if not exists negocio_id uuid default public.negocio_actual(),
                             add column if not exists owner_id uuid default auth.uid();

-- 4) Backfill: crea el negocio "Iconic", asigna todo lo existente al primer
--    usuario, y escribe negocio_id en el app_metadata de TODOS los usuarios
do $$
declare n uuid; u uuid;
begin
  select id into n from public.negocios where nombre = 'Iconic' limit 1;
  if n is null then
    insert into public.negocios (nombre) values ('Iconic') returning id into n;
  end if;
  select id into u from auth.users order by created_at limit 1;
  update public.equipos  set negocio_id = n where negocio_id is null;
  update public.clientes set negocio_id = n, owner_id = coalesce(owner_id, u) where negocio_id is null or owner_id is null;
  update public.ventas   set negocio_id = n, owner_id = coalesce(owner_id, u) where negocio_id is null or owner_id is null;
  update public.cobros   set negocio_id = n, owner_id = coalesce(owner_id, u) where negocio_id is null or owner_id is null;
  update public.reservas set negocio_id = n, owner_id = coalesce(owner_id, u) where negocio_id is null or owner_id is null;
  update public.reclamos set negocio_id = n, owner_id = coalesce(owner_id, u) where negocio_id is null or owner_id is null;
  update auth.users set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('negocio_id', n::text);
end $$;

-- 5) RLS nuevo: por negocio (compartido) o por negocio+dueño (privado)
do $$
declare pol record;
begin
  for pol in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('clientes','cobros','equipos','reclamos','reservas','ventas','vendedores','negocios')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

alter table public.negocios enable row level security;
create policy "mi_negocio" on public.negocios for select to authenticated
  using (id = public.negocio_actual());

-- Stock GLOBAL: lo comparten todos los negocios (decisión de producto)
alter table public.equipos enable row level security;
create policy "stock_global" on public.equipos for all to authenticated
  using (true) with check (true);

alter table public.vendedores enable row level security;
create policy "negocio" on public.vendedores for all to authenticated
  using (negocio_id = public.negocio_actual())
  with check (negocio_id = public.negocio_actual());

-- Privados por usuario (dentro del negocio)
alter table public.clientes enable row level security;
create policy "propios" on public.clientes for all to authenticated
  using (negocio_id = public.negocio_actual() and owner_id = (select auth.uid()))
  with check (negocio_id = public.negocio_actual() and owner_id = (select auth.uid()));

alter table public.ventas enable row level security;
create policy "propios" on public.ventas for all to authenticated
  using (negocio_id = public.negocio_actual() and owner_id = (select auth.uid()))
  with check (negocio_id = public.negocio_actual() and owner_id = (select auth.uid()));

alter table public.cobros enable row level security;
create policy "propios" on public.cobros for all to authenticated
  using (negocio_id = public.negocio_actual() and owner_id = (select auth.uid()))
  with check (negocio_id = public.negocio_actual() and owner_id = (select auth.uid()));

alter table public.reservas enable row level security;
create policy "propios" on public.reservas for all to authenticated
  using (negocio_id = public.negocio_actual() and owner_id = (select auth.uid()))
  with check (negocio_id = public.negocio_actual() and owner_id = (select auth.uid()));

alter table public.reclamos enable row level security;
create policy "propios" on public.reclamos for all to authenticated
  using (negocio_id = public.negocio_actual() and owner_id = (select auth.uid()))
  with check (negocio_id = public.negocio_actual() and owner_id = (select auth.uid()));

notify pgrst, 'reload schema';

-- ============================================================================
-- ALTA DE UN NEGOCIO NUEVO (manual, 2 min):
-- 1. insert into public.negocios (nombre) values ('Nombre del negocio') returning id;
-- 2. Authentication → Add user (email + contraseña) por cada usuario del negocio.
-- 3. Vinculá cada usuario al negocio (reemplazar UUID e email):
--    update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb)
--      || jsonb_build_object('negocio_id','<UUID-DEL-NEGOCIO>')
--    where email = 'usuario@negocio.com';
-- 4. El usuario debe CERRAR SESIÓN y volver a entrar para que el token tome el negocio.
-- ============================================================================
