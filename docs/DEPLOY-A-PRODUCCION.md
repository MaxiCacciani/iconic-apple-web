# Runbook: mergear `dev` a producción

Guía paso a paso para pasar todo lo trabajado en `dev` a producción (Vercel +
Supabase de prod). Seguí las fases **en orden**. Marcá cada casilla al hacerla.

> **Idea que te saca el miedo:** casi todas las migraciones son idempotentes
> (`create ... if not exists`, `create or replace`, backfills con guardas). Podés
> correr toda la secuencia aunque alguna ya la hayas corrido: repetirla no rompe
> nada. No hace falta que recuerdes qué corriste antes.

Objetivo de tenants en prod: **2 negocios** — Iconic (vos) + TuIphoneVcp (tu socio),
con **stock compartido** y datos privados por usuario.

---

## Fase 0 — Antes de empezar (5 min)

- [ ] **Backup.** El free tier de Supabase **no** tiene backups automáticos ni PITR
  (eso es de los planes pagos), así que hacete uno a mano. Elegí una:

  - **Rápido (2 min, sin instalar nada):** Supabase → Table Editor → por cada
    tabla, export a **CSV**. Con estas 6 alcanza: `ventas`, `clientes`, `cobros`,
    `equipos`, `reservas`, `reclamos`. Guardalos en una carpeta.
  - **Completo (esquema + datos, requiere Docker):** prendé Docker Desktop y
    activá la integración con WSL (Settings → Resources → WSL Integration), y
    después:
    ```bash
    docker run --rm postgres:17 pg_dump "TU_CONNECTION_STRING" > ~/backup-prod-$(date +%F).sql
    ```
    El connection string sale de Supabase → Project Settings → Database →
    **Session pooler** (puerto 5432; el 6543 no funciona con `pg_dump`).

  > **Cuánto riesgo hay realmente:** ninguna de las 11 migraciones borra tablas ni
  > columnas — son aditivas. Lo más invasivo son los backfills (`update` con
  > guardas) y el drop+recreate de políticas dentro del mismo script. Las columnas
  > viejas (`lineas`, `equipo_label`, etc.) quedan intactas como respaldo. El
  > riesgo real es que algo quede mal asignado, no que se pierda.
- [ ] Avisale a tu socio que no opere la app por ~15 minutos (ventana de deploy).
- [ ] Tené a mano: el **email del usuario de tu socio** (si ya existe) y una
  contraseña para crearlo si no existe.

---

## Fase A — Migraciones de base de datos (en el SQL Editor de PROD)

Corré cada archivo **completo**, uno tras otro, **en este orden**. Abrí el archivo
del repo, copiá todo su contenido, pegalo en el SQL Editor de producción y dale Run.
Esperá el "Success" antes de pasar al siguiente.

- [ ] 1. `supabase/migracion-reclamos.sql`
- [ ] 2. `supabase/policies.sql`
- [ ] 3. `supabase/migracion-garantia.sql`
- [ ] 4. `supabase/migracion-multitenant.sql`  ← crea el negocio **Iconic** y te asigna todos los datos
- [ ] 5. `supabase/migracion-stock-global.sql`
- [ ] 6. `supabase/migracion-comisiones.sql`
- [ ] 7. `supabase/migracion-comision-capital.sql`
- [ ] 8. `supabase/migracion-cuenta-corriente.sql`
- [ ] 9. `supabase/migracion-ventas-relacional.sql`
- [ ] 10. `supabase/migracion-canje-negocio.sql`

**No corras todavía la #11** (`migracion-garantias-privadas.sql`). Esa va en la
Fase D, después del deploy, porque pone el bucket privado y rompería el frontend
viejo que sigue vivo hasta el merge.

Por qué el orden importa: la #4 crea la función `negocio_actual()` que usan la #6,
#8 y #9. Corriéndolas así, todo resuelve.

> **Ojo (normal):** al correr la #4, tu sesión abierta en la app deja de ver datos
> hasta que **cierres sesión y vuelvas a entrar** (tu token viejo no tiene el
> negocio). No es un error.

---

## Fase B — Crear el segundo negocio y el usuario del socio

La #4 ya creó **Iconic** y te vinculó a vos automáticamente. Ahora, a mano, el
segundo negocio:

- [ ] **B1.** En el SQL Editor, crear el negocio y **anotar el UUID** que devuelve:
  ```sql
  insert into public.negocios (nombre) values ('TuIphoneVcp') returning id;
  ```
  Copiá el `id` que sale (algo como `a1b2c3d4-...`).

- [ ] **B2.** Crear el usuario del socio: Supabase → **Authentication → Add user**
  → email + contraseña del socio. (Si ya existe, saltá este paso.)

- [ ] **B3.** Vincular ese usuario al negocio TuIphoneVcp. Reemplazá el UUID (de
  B1) y el email real del socio:
  ```sql
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('negocio_id', '<UUID-DE-TUIPHONEVCP>')
  where email = '<email-del-socio>';
  ```

- [ ] **B4.** Verificar que quedó linkeado:
  ```sql
  select u.email, u.raw_app_meta_data->>'negocio_id' as negocio, n.nombre
  from auth.users u
  left join public.negocios n on n.id = (u.raw_app_meta_data->>'negocio_id')::uuid
  order by u.created_at;
  ```
  Deberías ver tu email con Iconic y el del socio con TuIphoneVcp.

- [ ] **B5.** Vos y tu socio **cierran sesión y vuelven a entrar** en la app para
  que el token tome el negocio. (Tu socio recién puede entrar después del deploy,
  Fase C — no importa el orden, el link ya quedó hecho.)

---

## Fase C — Merge y deploy del frontend

- [ ] **C1.** Mergear `dev` → `master`:
  ```bash
  git checkout master
  git merge dev
  git push origin master
  ```
  (O por Pull Request en GitHub, como prefieras. `master` dispara el deploy en
  Vercel automáticamente.)

- [ ] **C2.** Esperar a que **Vercel termine el deploy** (dashboard de Vercel →
  que el deployment de producción diga "Ready").

- [ ] **C3.** Volver a `dev` para seguir laburando después:
  ```bash
  git checkout dev
  ```

---

## Fase D — La migración acoplada (JUSTO después del deploy)

- [ ] **D1.** Ahora sí, en el SQL Editor de prod, correr:
  `supabase/migracion-garantias-privadas.sql`

  Esto pone el bucket de garantías privado y convierte las URLs guardadas a paths.
  Como el frontend nuevo (ya deployado en C2) usa signed URLs, las garantías se
  siguen viendo bien. Si corrieras esto **antes** del deploy, se romperían las
  garantías del front viejo — por eso va acá.

---

## Fase E — Verificación (probar en la app de prod)

- [ ] Entrás con tu usuario → ves tus ventas, stock, clientes.
- [ ] Tu socio entra con su usuario → ve el **mismo stock** pero **no** tus ventas
  ni clientes (datos privados).
- [ ] Registrar una venta de prueba (borrala después) → funciona; el stock baja.
- [ ] Abrir una garantía existente → se ve (vía signed URL).
- [ ] Cargar un equipo eligiendo el negocio dueño → aparece "de {negocio}" para el otro.

Verificaciones SQL rápidas (opcionales):
```sql
select public from storage.buckets where id = 'garantias';   -- debe dar false
select count(*) from public.venta_items;                     -- >= cantidad de ventas
select nombre from public.negocios order by nombre;          -- Iconic, TuIphoneVcp
```

---

## Si algo sale mal

- Las migraciones son re-ejecutables: si una tira error a mitad, arreglás lo que
  reporta y la volvés a correr entera (idempotente).
- El caso más común: un usuario "no ve nada" → casi siempre es que **no cerró y
  volvió a abrir sesión** después de la Fase B, o que su `negocio_id` en
  `raw_app_meta_data` no coincide con un negocio real (revisá con la query de B4).
- Si necesitás volver atrás, usás el backup de la Fase 0 (CSV o dump). Recordá que
  ninguna migración borra columnas: el `lineas` JSON y `equipo_label` de las ventas
  siguen ahí, así que los datos originales de cada venta no se pierden aunque el
  backfill de `venta_items` haya salido raro.
