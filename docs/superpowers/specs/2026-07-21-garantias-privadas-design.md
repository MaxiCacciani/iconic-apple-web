# Garantías en bucket privado con signed URLs — diseño

Fecha: 2026-07-21 · Estado: aprobado por Maxi

## Problema

Hallazgo de la auditoría de seguridad (`/cso`, 2026-07-21): el bucket de storage
`garantias` es **público** y su política RLS de lectura (`garantias_lectura_publica`,
`for select using (bucket_id='garantias')`, sin `to authenticated`) aplica al rol
**anon**. Combinado, cualquiera con la anon key (que viaja en el bundle JS del
sitio) puede **listar** todos los objetos del bucket y descargarlos. Los archivos
se nombran por UUID de venta, lo que evita adivinarlos de a uno, pero el listado
los enumera igual. Resultado: exposición masiva de comprobantes de garantía —
datos de clientes (nombre, equipo, IMEI, fecha) — sin autenticación.

## Objetivo

Que un comprobante de garantía solo se pueda ver desde la app con sesión iniciada,
mediante una **signed URL** (URL firmada de corta duración). El rol anon debe
quedar sin ningún acceso: ni listar, ni firmar, ni descargar.

## Decisiones tomadas

| Decisión | Elección |
|---|---|
| Acceso | Bucket **privado** + signed URLs de **1 hora** (fijo), generadas al momento de ver. |
| TTL | 1 hora, no configurable. |
| Watermark | No (YAGNI). |
| Datos existentes | La migración **convierte** los `garantia_url` viejos (URL pública) a path. Formato único, sin lógica de compatibilidad permanente. |
| Subida | Sin cambios (ya era auth-only). |

## Cambios en base de datos

Migración `supabase/migracion-garantias-privadas.sql` (se corre en dev ahora y en
prod al deployar):

1. `update storage.buckets set public = false where id = 'garantias';` — el bucket
   deja de servir objetos por URL directa.
2. Reemplazar la política de lectura:
   ```sql
   drop policy if exists "garantias_lectura_publica" on storage.objects;
   create policy "garantias_lectura_autenticados" on storage.objects
     for select to authenticated using (bucket_id = 'garantias');
   ```
   Solo los autenticados pueden leer/firmar; anon pierde el `select` (y con él la
   capacidad de listar). Las políticas de insert/update/delete (auth-only) no se
   tocan.
3. Convertir los comprobantes ya cargados de URL pública a path (idempotente: solo
   filas que contienen `/garantias/`):
   ```sql
   update public.ventas
   set garantia_url = (
     select string_agg(
       case when u like '%/garantias/%' then split_part(u, '/garantias/', 2) else u end,
       '|')
     from unnest(string_to_array(garantia_url, '|')) as u
   )
   where garantia_url is not null and garantia_url like '%/garantias/%';
   ```
   Los paths son `{ventaId}[_{n}].{ext}` (UUID + extensión), sin caracteres que
   necesiten decodificar.

**Nota de despliegue**: esta migración es un cambio acoplado front+BD. Una vez que
el bucket es privado, la app **debe** usar signed URLs; y una vez que `garantia_url`
guarda paths, la app **debe** leer paths. Por eso el front (Tasks de código) y la
migración se despliegan juntos. En dev se corre la migración cuando el código está
listo; en prod, al mergear a master.

## Capa de datos (`src/lib/db.js`)

- `uploadGarantia(ventaId, files)`: en vez de `getPublicUrl`, devuelve el **path**
  de cada archivo. El valor guardado en `garantia_url` pasa a ser
  `path1|path2|…`. Ya no llama a `getPublicUrl`.
- Nueva `garantiaSignedUrls(garantiaUrl)`: parte el string por `|`, llama
  `supabase.storage.from('garantias').createSignedUrl(path, 3600)` por cada path y
  devuelve un array de `{ url, path }` (o `[]` si no hay). Si alguna falla, se
  omite esa entrada (el resto se muestra).
- `deleteGarantia(garantiaUrl)`: ahora `garantia_url` ya son paths, así que se usan
  directo con `.remove(paths)` — se elimina el parseo de URL actual.

## UI

La signed URL se genera **al momento de ver**, no en la carga de listas (sería
malgastar firmas para comprobantes que nadie abre).

- **`src/screens/Ventas.jsx` — `GarantiaModal`**: al abrir, hace `await
  garantiaSignedUrls(venta.garantiaUrl)` (async), guarda las URLs firmadas en
  estado local y recién ahí renderiza el `<iframe>` (PDF) o los `<img>`. Mientras
  se generan, muestra "Cargando comprobante…". El detector de PDF pasa a mirar el
  path/nombre (no la URL firmada, que lleva query params).
- **`src/screens/Clientes.jsx`**: los `<a href={url}>` inline pasan a ser botones
  que, al click, hacen `garantiaSignedUrls` para ese path y `window.open(url)`.
- **`src/components/VentaDetalleModal.jsx`**: igual que Clientes — los `<a href>`
  de garantía pasan a botones que generan la signed URL al click y abren en pestaña
  nueva. (El bloque por línea `l.garantiaUrl` hoy no se puebla desde `venta_items`;
  se deja como está o se limpia, no afecta.)

## Verificación (QA con agent-browser en dev)

1. Subir un comprobante (PDF) a una venta → se guarda; en la BD `garantia_url` es
   un path, no una URL.
2. Abrir el modal de garantía → muestra el PDF vía signed URL (se ve el
   "Cargando…" breve y luego el documento).
3. Abrir el link de garantía desde Clientes y desde el detalle de venta → abre el
   comprobante en pestaña nueva.
4. Borrar un comprobante → se elimina del storage y `garantia_url` queda null.
5. **Seguridad**: con el bucket privado, pegar una URL pública vieja
   (`/storage/v1/object/public/garantias/…`) en el navegador → **403/404** (ya no
   sirve). Una signed URL recién generada → abre; a la hora, caduca.
6. **Anon**: sin sesión, intentar `list()` del bucket con la anon key → **vacío o
   denegado** (la política ya no da select a anon).
7. Regresión: un comprobante cargado **antes** de la migración (URL vieja
   convertida a path) se puede ver igual desde la app.
