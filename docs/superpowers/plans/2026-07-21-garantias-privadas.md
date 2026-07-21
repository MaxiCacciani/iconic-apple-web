# Garantías en bucket privado con signed URLs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que los comprobantes de garantía solo se vean desde la app autenticada vía signed URLs de 1 hora, con el bucket privado y el rol anon sin ningún acceso.

**Architecture:** El bucket `garantias` pasa a privado; `ventas.garantia_url` guarda paths (no URLs públicas); la app genera signed URLs al momento de ver cada comprobante. La migración convierte los datos existentes.

**Tech Stack:** React 19 + Vite, Supabase Storage (createSignedUrl), supabase-js.

## Global Constraints

- Trabajar en la rama `dev`; commits atómicos por tarea (CLAUDE.md).
- UI en español con tildes.
- **No hay suite de tests**: verificación por tarea = `npm run build` + QA con agent-browser contra `npm run dev`.
- **No puedo correr SQL contra Supabase**: la migración la corre Maxi en el SQL editor de iconic-dev (gate antes de la QA).
- **Cambio acoplado front + BD**: una vez que el bucket es privado, la app DEBE usar signed URLs; una vez que `garantia_url` guarda paths, la app DEBE leer paths. En dev, la migración se corre cuando el código está listo (Tasks 2-4 hechas). En prod, código y migración se deployan juntos al mergear a master.
- TTL de las signed URLs: **3600 s (1 hora)**, fijo. Sin watermark (YAGNI).
- Credenciales dev QA: chacho@iconic.com / maxi (Iconic).

## Estructura de archivos

- Create: `supabase/migracion-garantias-privadas.sql` — bucket privado + política + convertir URLs a paths.
- Modify: `src/lib/db.js` — `uploadGarantia` devuelve paths; nueva `garantiaSignedUrls` + `abrirGarantiaEnVentana`; `deleteGarantia` simplificada.
- Modify: `src/screens/Ventas.jsx` — `GarantiaModal` genera signed URLs async para preview y descarga.
- Modify: `src/screens/Clientes.jsx` — links de garantía → botones que firman y abren al click.
- Modify: `src/components/VentaDetalleModal.jsx` — idem Clientes.
- Modify: `docs/referencia.md` — nota de storage privado.

---

### Task 1: Migración SQL (bucket privado + convertir datos)

**Files:**
- Create: `supabase/migracion-garantias-privadas.sql`

**Interfaces:**
- Produces: bucket `garantias` con `public=false`; política `garantias_lectura_autenticados` (select solo a authenticated); `ventas.garantia_url` con paths en vez de URLs. Tasks 2-4 asumen paths.

- [ ] **Step 1: Escribir la migración**

```sql
-- ============================================================================
-- Migración: bucket de garantías privado + signed URLs
-- Ejecutar en el SQL Editor (iconic-dev ahora; producción al deployar junto
-- con el front — es un cambio acoplado).
--
-- Remedia: comprobantes de garantía (PII de clientes) enumerables sin auth en
-- un bucket público.
-- ============================================================================

-- 1) Bucket privado: deja de servir objetos por URL directa
update storage.buckets set public = false where id = 'garantias';

-- 2) Lectura solo para autenticados (anon pierde select → no puede listar ni
--    firmar). Las políticas de subir/actualizar/borrar (auth-only) no se tocan.
drop policy if exists "garantias_lectura_publica" on storage.objects;
create policy "garantias_lectura_autenticados" on storage.objects
  for select to authenticated using (bucket_id = 'garantias');

-- 3) Convertir los garantia_url ya cargados: URL pública -> path.
--    Idempotente: solo filas que contienen '/garantias/'. Los paths son
--    {ventaId}[_{n}].{ext} (UUID + extensión), sin caracteres a decodificar.
update public.ventas
set garantia_url = (
  select string_agg(
    case when u like '%/garantias/%' then split_part(u, '/garantias/', 2) else u end,
    '|' order by ord)
  from unnest(string_to_array(garantia_url, '|')) with ordinality as t(u, ord)
)
where garantia_url is not null and garantia_url like '%/garantias/%';

notify pgrst, 'reload schema';

-- Verificación (correr aparte tras la migración):
--   select public from storage.buckets where id = 'garantias';        -- false
--   select garantia_url from public.ventas where garantia_url is not null limit 5;  -- paths, sin http
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migracion-garantias-privadas.sql
git commit -m "feat(sql): bucket de garantías privado + convertir URLs a paths"
```

- [ ] **Step 3: GATE — la migración se corre DESPUÉS de las Tasks 2-4**

A diferencia de otras migraciones, esta se corre cuando el código ya espera paths (para no dejar el dev roto entre medio). Pasarle el SQL a Maxi tras terminar la Task 4 y antes de la QA (Task 5).

---

### Task 2: Capa de datos (`src/lib/db.js`)

**Files:**
- Modify: `src/lib/db.js` — `uploadGarantia` (~690-707), `deleteGarantia` (~709-717); agregar `garantiaSignedUrls` y `abrirGarantiaEnVentana`

**Interfaces:**
- Produces (usadas por Tasks 3-4):
  - `uploadGarantia(ventaId, files) → { url: 'path1|path2', nombre: 'a|b' }` (url = paths).
  - `garantiaSignedUrls(garantiaUrl) → Promise<{ url, path }[]>` (URLs firmadas de 1 h).
  - `abrirGarantiaEnVentana(win, garantiaUrl) → Promise<void>` (firma el primer path y navega `win` ahí; si falla, cierra `win`).
  - `deleteGarantia(garantiaUrl) → Promise<void>` (garantia_url ya son paths).

- [ ] **Step 1: `uploadGarantia` devuelve paths**

Reemplazar `uploadGarantia` (líneas ~690-707): quitar `getPublicUrl`, devolver el path.

```js
export async function uploadGarantia(ventaId, files) {
  const arr = Array.isArray(files) ? files : [files];
  const multi = arr.length > 1;
  const results = await Promise.all(arr.map(async (file, i) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const path = multi ? `${ventaId}_${i + 1}.${ext}` : `${ventaId}.${ext}`;
    const { error } = await supabase.storage
      .from('garantias')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return { path, nombre: file.name };
  }));
  return {
    url:    results.map(r => r.path).join('|'),   // 'url' sigue siendo la clave que guarda garantia_url; ahora contiene paths
    nombre: results.map(r => r.nombre).join('|'),
  };
}
```

- [ ] **Step 2: `garantiaSignedUrls` y `abrirGarantiaEnVentana`**

Agregar después de `uploadGarantia`:

```js
// Genera signed URLs (1 h) para los paths guardados en garantia_url
export async function garantiaSignedUrls(garantiaUrl) {
  const paths = (garantiaUrl || '').split('|').filter(Boolean);
  if (paths.length === 0) return [];
  const results = await Promise.all(paths.map(async (path) => {
    const { data, error } = await supabase.storage.from('garantias').createSignedUrl(path, 3600);
    return error ? null : { url: data.signedUrl, path };
  }));
  return results.filter(Boolean);
}

// Abre el primer comprobante en una ventana ya abierta (sincrónicamente en el
// click) para no ser bloqueado por el popup blocker tras el await de la firma.
export async function abrirGarantiaEnVentana(win, garantiaUrl) {
  try {
    const urls = await garantiaSignedUrls(garantiaUrl);
    if (urls[0] && win) win.location.href = urls[0].url;
    else if (win) win.close();
  } catch (e) {
    if (win) win.close();
    throw e;
  }
}
```

- [ ] **Step 3: `deleteGarantia` simplificada (paths directos)**

Reemplazar `deleteGarantia` (líneas ~709-717):

```js
export async function deleteGarantia(garantiaUrl) {
  if (!garantiaUrl) return;
  const paths = garantiaUrl.split('|').filter(Boolean);
  if (paths.length > 0) await supabase.storage.from('garantias').remove(paths);
}
```

- [ ] **Step 4: Build + commit**

Run: `npm run build` → Expected: `✓ built`

```bash
git add src/lib/db.js
git commit -m "feat(db): garantías por path + signed URLs de 1 hora"
```

---

### Task 3: `GarantiaModal` (Ventas.jsx) con preview firmado

**Files:**
- Modify: `src/screens/Ventas.jsx` — import de React (~1), import de db (~6), `GarantiaModal` (~126-160)

**Interfaces:**
- Consumes: `garantiaSignedUrls` (Task 2).

- [ ] **Step 1: Imports**

Asegurar `useEffect` en el import de React (línea 1). Si es `import { useState, useCallback, useRef } from 'react';`, dejarlo `import { useState, useEffect, useCallback, useRef } from 'react';`.

Agregar `garantiaSignedUrls` al import de db (línea 6):

```js
import { uploadGarantia, deleteGarantia, garantiaSignedUrls } from '../lib/db.js';
```

- [ ] **Step 2: `GarantiaModal` genera signed URLs al abrir**

Reemplazar la función `GarantiaModal` completa (desde `function GarantiaModal(` hasta su `}` de cierre, ~126-160):

```jsx
function GarantiaModal({ venta, onClose, onDelete }) {
  const paths = (venta.garantiaUrl    || '').split('|').filter(Boolean);
  const names = (venta.garantiaNombre || '').split('|').filter(Boolean);
  const isPdf = paths.length > 0 && paths[0].toLowerCase().endsWith('.pdf');
  const [signed, setSigned] = useState(null);  // null = cargando; [] = error/sin archivos
  useEffect(() => {
    let vivo = true;
    garantiaSignedUrls(venta.garantiaUrl)
      .then(r => { if (vivo) setSigned(r.map(x => x.url)); })
      .catch(() => { if (vivo) setSigned([]); });
    return () => { vivo = false; };
  }, [venta.garantiaUrl]);
  const btnBase = { padding: '10px 18px', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontFamily: "'Hanken Grotesk', sans-serif", textDecoration: 'none' };
  return (
    <Modal title={`Garantía · ${venta.equipo}`} onClose={onClose} width={720}>
      <div style={{ fontSize: 12.5, color: '#828a94', marginBottom: 16, fontFamily: "'JetBrains Mono', monospace" }}>
        {names.join(' · ')}
      </div>
      {signed === null && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#6a717b', fontSize: 13.5 }}>Cargando comprobante…</div>
      )}
      {signed !== null && signed.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#d98a76', fontSize: 13.5 }}>No se pudo cargar el comprobante.</div>
      )}
      {signed !== null && signed.length > 0 && isPdf && (
        <iframe src={signed[0]} title="Garantía PDF" style={{ width: '100%', height: 560, borderRadius: 12, border: '1px solid rgba(231,238,246,0.1)' }} />
      )}
      {signed !== null && signed.length > 0 && !isPdf && signed.map((url, i) => (
        <img key={i} src={url} alt={`Garantía ${i + 1}`}
          style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(231,238,246,0.1)', maxHeight: 420, objectFit: 'contain', background: '#111', marginBottom: i < signed.length - 1 ? 12 : 0 }}
        />
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <button onClick={() => onDelete(venta.id, venta.garantiaUrl)}
          style={{ ...btnBase, background: 'rgba(217,138,118,0.1)', border: '1px solid rgba(217,138,118,0.3)', color: '#d98a76' }}>
          Eliminar garantía
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {(signed || []).map((url, i) => (
            <a key={i} href={url} download={names[i] || `garantia${(signed || []).length > 1 ? `_${i + 1}` : ''}`}
              style={{ ...btnBase, background: 'rgba(116,168,214,0.12)', border: '1px solid rgba(116,168,214,0.3)', color: '#74a8d6', display: 'inline-block' }}>
              {(signed || []).length > 1 ? `Descargar (${i + 1})` : 'Descargar'}
            </a>
          ))}
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Build + commit**

Run: `npm run build` → Expected: `✓ built`

```bash
git add src/screens/Ventas.jsx
git commit -m "feat: preview de garantía con signed URL en el modal"
```

---

### Task 4: Links de garantía en Clientes y VentaDetalle → botones firmados

**Files:**
- Modify: `src/screens/Clientes.jsx` — link `<a>` de garantía (~350)
- Modify: `src/components/VentaDetalleModal.jsx` — links `<a>` de garantía (~70 y ~136)

**Interfaces:**
- Consumes: `abrirGarantiaEnVentana` (Task 2).

- [ ] **Step 1: Clientes.jsx — botón que firma y abre**

Agregar el import de db (buscar si ya importa de `../lib/db.js`; si no, agregar la línea):

```js
import { abrirGarantiaEnVentana } from '../lib/db.js';
```

Reemplazar el `<a href={url} …>` de garantía (~350) por un `<button>` que abre una pestaña en blanco sincrónicamente y la navega a la signed URL:

```jsx
                      {co.garantiaUrl && co.garantiaUrl.split('|').filter(Boolean).map((path, gi) => (
                        <button key={gi}
                          onClick={e => { e.stopPropagation(); const w = window.open('about:blank', '_blank'); abrirGarantiaEnVentana(w, path).catch(() => {}); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#74a8d6', padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(116,168,214,0.3)', background: 'rgba(116,168,214,0.06)', cursor: 'pointer', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                          ↗ {co.garantiaNombre ? co.garantiaNombre.split('|')[gi] || `Garantía ${gi+1}` : `Garantía ${gi+1}`}
                        </button>
                      ))}
```

(Pasar `path` individual a `abrirGarantiaEnVentana` funciona: `garantiaSignedUrls` lo trata como string de un solo path.)

- [ ] **Step 2: VentaDetalleModal.jsx — mismo patrón**

Agregar el import:

```js
import { abrirGarantiaEnVentana } from '../lib/db.js';
```

Reemplazar el bloque `venta.garantiaUrl` (~136) — los `<a href={url}>` por botones:

```jsx
            {venta.garantiaUrl.split('|').filter(Boolean).map((path, i) => {
              const nombre = venta.garantiaNombre ? (venta.garantiaNombre.split('|')[i] || `Garantía ${i + 1}`) : `Garantía ${i + 1}`;
              return (
                <button key={i}
                  onClick={() => { const w = window.open('about:blank', '_blank'); abrirGarantiaEnVentana(w, path).catch(() => {}); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: 'rgba(130,179,157,0.08)', border: '1px solid rgba(130,179,157,0.3)', color: '#82b39d', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Hanken Grotesk', sans-serif" }}>
                  ↗ {nombre}
                </button>
              );
            })}
```

El bloque por línea `l.garantiaUrl` (~65) no se puebla desde `venta_items` (`rowToVenta` no mapea garantía por línea a `garantiaUrl`), así que queda muerto; dejarlo como está (no rompe) o borrarlo. Si se borra, quitar líneas 65-78 aproximadamente.

- [ ] **Step 3: Build + commit**

Run: `npm run build` → Expected: `✓ built`

```bash
git add src/screens/Clientes.jsx src/components/VentaDetalleModal.jsx
git commit -m "feat: abrir garantía con signed URL desde clientes y detalle"
```

---

### Task 5: Gate migración, QA, docs y push

**Files:**
- Modify: `docs/referencia.md`

**Interfaces:**
- Consumes: BD dev con la migración corrida, dev server, usuario de prueba.

- [ ] **Step 1: GATE — Maxi corre `migracion-garantias-privadas.sql` en iconic-dev** (ahora que el código ya espera paths). Correr las 2 consultas de verificación (bucket `public=false`, `garantia_url` sin `http`).

- [ ] **Step 2: QA con agent-browser** (`npm run dev`, login chacho). Escenarios del spec:
  1. Subir un PDF a una venta → en la BD `garantia_url` es un path (no URL). (Verificar por SQL con Maxi, o inferir: la subida no rompe.)
  2. Abrir el modal de garantía → "Cargando…" breve y luego el PDF vía signed URL.
  3. Abrir el link de garantía desde Clientes y desde el detalle de venta → abre en pestaña nueva.
  4. Borrar un comprobante → se elimina y `garantia_url` queda null.
  5. **Seguridad**: con una sesión anónima (o `curl`), pegar una URL pública vieja `/storage/v1/object/public/garantias/<uuid>.pdf` → **400/404** (bucket privado). Una signed URL recién generada → abre; caduca a la hora.
  6. **Anon no lista**: sin sesión, `supabase.storage.from('garantias').list()` con la anon key → vacío/denegado.
  7. Regresión: un comprobante cargado antes de la migración se ve igual (su URL vieja quedó convertida a path).

  Notas agent-browser: para el chequeo de seguridad #5/#6 usar `agent-browser eval` con `fetch()` o una request cruda; leer screenshots con Read.

- [ ] **Step 3: Actualizar `docs/referencia.md`**

En **Storage**, reemplazar la línea del bucket por:

```markdown
**Storage**: bucket `garantias` — PDF (1, máx. 2 páginas) o JPG (máx. 2) por venta. **Bucket privado**: los comprobantes se sirven con signed URLs de 1 hora generadas desde la app autenticada. `ventas.garantia_url` guarda los **paths** (no URLs). El rol anónimo no tiene acceso (ni listar ni descargar).
```

- [ ] **Step 4: Commit de docs, push y cierre**

```bash
git add docs/referencia.md
git commit -m "docs: garantías en bucket privado con signed URLs"
git push
```

Recordar al mergear a master: correr `migracion-garantias-privadas.sql` en producción **junto** con el deploy del front (cambio acoplado — no correr una sin el otro).
