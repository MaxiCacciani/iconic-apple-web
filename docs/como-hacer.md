# Cómo hacer tareas comunes

Guías paso a paso. Asumen que ya conocés la app; si es tu primer día, empezá por [el tutorial](tutorial-primera-venta.md).

## Cómo correr la app en tu compu

**Necesitás:** Node 20+, el repo clonado y un archivo `.env`.

1. Copiá el ejemplo y completá las credenciales (Supabase → Settings → API):

   ```bash
   cp .env.example .env
   ```

2. Instalá dependencias y levantá el servidor:

   ```bash
   npm install
   npm run dev
   ```

**Verificación:** abrí `http://localhost:5173` — tenés que ver la pantalla de login "Iconic Apple".

**Si falla:** `Missing Supabase URL` → el `.env` no existe o le faltan las dos variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Cómo ejecutar SQL en Supabase (políticas y migraciones)

1. Entrá a [supabase.com/dashboard](https://supabase.com/dashboard) → tu proyecto → **SQL Editor**.
2. **New query** → pegá el contenido del archivo (p. ej. [supabase/policies.sql](../supabase/policies.sql) o [supabase/migracion-reclamos.sql](../supabase/migracion-reclamos.sql)).
3. **Run**.

**Verificación:** "Success. No rows returned". Los scripts son idempotentes: correrlos dos veces no rompe nada.

## Cómo deployar

No hay que hacer nada: cada push a `master` en GitHub dispara el deploy automático en Vercel (1-2 minutos). El [vercel.json](../vercel.json) redirige todas las rutas a `index.html` para que recargar en `/stock` no dé 404.

**Verificación:** abrí el sitio en producción y recargá en cualquier ruta.

## Cómo separar la base de desarrollo de la de producción

1. Creá un segundo proyecto en Supabase (p. ej. `iconic-dev`).
2. Replicá el esquema: dump de producción y pegado en el SQL Editor del proyecto nuevo:

   ```bash
   npx supabase db dump --db-url "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" -f schema.sql
   ```

3. En el proyecto dev, creá a mano: el bucket de Storage `garantias` (público) y tu usuario (Authentication → Add user).
4. Apuntá tu `.env` local a las credenciales del proyecto dev. Vercel no se toca: sigue usando producción.

**Verificación:** logueate en `localhost` y cargá un equipo de prueba — no tiene que aparecer en el sitio de producción.

## Cómo adjuntar una garantía a una venta

1. En **Historial de ventas**, clic en el círculo `○` de la fila.
2. Elegí el archivo: 1 PDF (máx. 2 páginas) o hasta 2 imágenes JPG.
3. El ícono pasa a `📎`; clic para ver, descargar o eliminar.

**Si falla:** "Solo se aceptan PDF o JPG" / "máximo 2 páginas" — convertí el archivo antes de subirlo.

## Cómo registrar un vendedor

**Historial de ventas → + Vendedor** → asigná número y nombre. El número se elige en el paso 5 de cada venta. Se guarda en el navegador (localStorage), no en la base.

## Relacionado

[Referencia completa](referencia.md) · [Decisiones de diseño](explicacion.md)
