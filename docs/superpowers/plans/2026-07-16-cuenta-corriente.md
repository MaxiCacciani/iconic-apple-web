# Cuenta corriente entre socios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la cuenta corriente entre negocios permita saldar deudas (el acreedor marca líneas como pagadas) y registrar movimientos manuales fuera de la app, todo en un modal desde Ganancias.

**Architecture:** Modelo A del spec ([2026-07-16-cuenta-corriente-design.md](../specs/2026-07-16-cuenta-corriente-design.md)): flag `pagado`/`pagado_en` en la tabla `comisiones` existente + tabla nueva `movimientos` para lo manual. El estado vive en `App.jsx` (como `comisiones`), la UI en un componente nuevo `CuentaCorrienteModal` abierto desde el bloque de cuenta corriente de `Ganancias.jsx`, que se simplifica.

**Tech Stack:** React 19 + Vite, Supabase (PostgreSQL + RLS), estilos inline con la paleta existente.

## Global Constraints

- Trabajar en la rama `dev`; commits atómicos por tarea (CLAUDE.md).
- Toda la UI en español; montos en USD con `fUSD` de `src/lib/utils.js`.
- Paleta: verde `#82b39d` (a favor), rojo `#d98a76` (en contra), gris `#828a94`, azul `#74a8d6` (acciones), fondo card `#181b20`. Helpers `MONO`/`SERIF` como en Ganancias.jsx.
- **No hay suite de tests en el repo**: la verificación por tarea es `npm run build` (falla en sintaxis/imports rotos) y la verificación funcional es QA con agent-browser contra `npm run dev` (regla de CLAUDE.md). No introducir un test runner — fuera de alcance.
- Tolerancia de deploy: el frontend puede llegar a prod antes que la migración → `fetchMovimientos` devuelve `[]` si la tabla no existe; `fetchComisiones` mapea `pagado`/`pagadoEn` con fallback `false`/`null`.
- Solo el **acreedor** marca/desmarca pagos (en comisiones el acreedor es `negocio_duenio`; en movimientos, `negocio_acreedor`). RLS lo garantiza además de la UI.
- Credenciales dev para QA: chacho@iconic.com / maxi (Iconic) y elialcober@neg.com / maxi (TuIphoneVcp).

---

### Task 1: Migración SQL

**Files:**
- Create: `supabase/migracion-cuenta-corriente.sql`

**Interfaces:**
- Produces: columnas `comisiones.pagado` (boolean, default false) y `comisiones.pagado_en` (date); tabla `public.movimientos` con RLS. Las tareas 2+ asumen este esquema en la BD dev.

- [ ] **Step 1: Escribir la migración**

```sql
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migracion-cuenta-corriente.sql
git commit -m "feat(sql): migración de cuenta corriente (pagos + movimientos manuales)"
```

- [ ] **Step 3: GATE — pedirle a Maxi que corra la migración en el SQL editor de iconic-dev**

Las tareas 2-5 (código) pueden avanzar sin la BD, pero la QA de la tarea 6 la necesita. Pasarle el SQL y esperar confirmación antes de la tarea 6.

---

### Task 2: Capa de datos (`src/lib/db.js`)

**Files:**
- Modify: `src/lib/db.js` — bloque `NEGOCIOS Y COMISIONES` (líneas ~483-525)

**Interfaces:**
- Consumes: helpers existentes `localDateISO()`, `isoToNum()`, `isoToLabel()` (ya definidos arriba en el archivo).
- Produces (usadas por App.jsx en Task 3):
  - `setComisionPagada(id, pagado: boolean) → Promise<void>`
  - `fetchMovimientos() → Promise<Movimiento[]>` con `Movimiento = { id, concepto, monto, negocioDeudor, negocioAcreedor, creadoPor, pagado, pagadoEn, fechaNum, fechaLabel }`
  - `createMovimiento({ fecha, concepto, monto, negocioDeudor, negocioAcreedor }) → Promise<Movimiento>`
  - `setMovimientoPagado(id, pagado: boolean) → Promise<void>`
  - `deleteMovimiento(id) → Promise<void>`
  - `fetchComisiones()` ahora incluye `pagado: boolean, pagadoEn: string|null` en cada fila.

- [ ] **Step 1: Mapear `pagado`/`pagadoEn` en `fetchComisiones`**

En el objeto que devuelve `data.map(c => ({ ... }))`, agregar después de `negocioVendedor`:

```js
    pagado: !!c.pagado,
    pagadoEn: c.pagado_en || null,
```

(El `select('*')` ya trae las columnas nuevas; `!!c.pagado` y `|| null` cubren la BD sin migrar.)

- [ ] **Step 2: Agregar las funciones nuevas después de `fetchComisiones`**

```js
export async function setComisionPagada(id, pagado) {
  const { error } = await supabase.from('comisiones')
    .update({ pagado, pagado_en: pagado ? localDateISO() : null })
    .eq('id', id);
  if (error) throw error;
}

// ─── MOVIMIENTOS (cuenta corriente manual entre socios) ──────────────────────

const rowToMovimiento = (m) => ({
  id: m.id,
  concepto: m.concepto,
  monto: Number(m.monto),
  negocioDeudor: m.negocio_deudor,
  negocioAcreedor: m.negocio_acreedor,
  creadoPor: m.creado_por,
  pagado: !!m.pagado,
  pagadoEn: m.pagado_en || null,
  fechaNum: isoToNum(m.fecha),
  fechaLabel: isoToLabel(m.fecha),
});

export async function fetchMovimientos() {
  const { data, error } = await supabase
    .from('movimientos')
    .select('*')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    // Tolerar que la tabla aún no exista (deploy antes que la migración)
    if (/schema cache|does not exist/i.test(error.message || '')) return [];
    throw error;
  }
  return data.map(rowToMovimiento);
}

export async function createMovimiento(mov) {
  const { data, error } = await supabase.from('movimientos').insert({
    fecha: mov.fecha || localDateISO(),
    concepto: mov.concepto,
    monto: mov.monto,
    negocio_deudor: mov.negocioDeudor,
    negocio_acreedor: mov.negocioAcreedor,
    // creado_por lo pone la BD con default negocio_actual()
  }).select().single();
  if (error) throw error;
  return rowToMovimiento(data);
}

export async function setMovimientoPagado(id, pagado) {
  const { error } = await supabase.from('movimientos')
    .update({ pagado, pagado_en: pagado ? localDateISO() : null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMovimiento(id) {
  const { error } = await supabase.from('movimientos').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: `✓ built in ...ms`

- [ ] **Step 4: Commit**

```bash
git add src/lib/db.js
git commit -m "feat(db): pagos de comisiones y movimientos manuales de cuenta corriente"
```

---

### Task 3: Estado y handlers en `App.jsx`

**Files:**
- Modify: `src/App.jsx` — estado (~línea 33), carga inicial (~líneas 62-81), handlers (después de `handleDeleteVenta`), render de Ganancias (~línea 573)

**Interfaces:**
- Consumes: `db.fetchMovimientos`, `db.createMovimiento`, `db.setMovimientoPagado`, `db.deleteMovimiento`, `db.setComisionPagada` (Task 2).
- Produces (props que Ganancias recibe en Task 5):
  - `movimientos: Movimiento[]`
  - `onSetPagado(tipo: 'comision'|'movimiento', id, pagado: boolean)`
  - `onSaldarTodo(items: {tipo, id}[])`
  - `onCrearMovimiento({ fecha, concepto, monto, negocioDeudor, negocioAcreedor })`
  - `onBorrarMovimiento(id)`

- [ ] **Step 1: Estado**

Debajo de `const [comisiones, setComisiones] = useState([]);`:

```js
  const [movimientos, setMovimientos] = useState([]);
```

- [ ] **Step 2: Carga inicial**

En el `Promise.all` de carga, después de `db.fetchComisiones().catch(() => []),` agregar:

```js
      db.fetchMovimientos().catch(() => []),
```

En el `.then(([eqs, cls, vts, cbs, rvs, vds, ngs, cms]) => {` agregar el parámetro `movs` al final (`..., cms, movs])`) y dentro del cuerpo:

```js
        setMovimientos(movs);
```

(El orden del destructuring debe coincidir con el orden del array del `Promise.all`.)

- [ ] **Step 3: Handlers**

Después de `handleDeleteVenta`:

```js
  // ─── Cuenta corriente entre socios ─────────────────────────────────────────
  const refrescarCC = async () => {
    const [cms, movs] = await Promise.all([
      db.fetchComisiones().catch(() => []),
      db.fetchMovimientos().catch(() => []),
    ]);
    setComisiones(cms);
    setMovimientos(movs);
  };

  const handleSetPagado = async (tipo, id, pagado) => {
    try {
      if (tipo === 'comision') await db.setComisionPagada(id, pagado);
      else await db.setMovimientoPagado(id, pagado);
      await refrescarCC();
    } catch (e) {
      showToast('Error al actualizar el pago: ' + e.message);
    }
  };

  const handleSaldarTodo = async (items) => {
    try {
      await Promise.all(items.map(i =>
        i.tipo === 'comision' ? db.setComisionPagada(i.id, true) : db.setMovimientoPagado(i.id, true)
      ));
      await refrescarCC();
      showToast(`${items.length} línea${items.length !== 1 ? 's' : ''} saldada${items.length !== 1 ? 's' : ''} ✓`);
    } catch (e) {
      showToast('Error al saldar: ' + e.message);
    }
  };

  const handleCrearMovimiento = async (mov) => {
    try {
      await db.createMovimiento(mov);
      setMovimientos(await db.fetchMovimientos());
      showToast('Movimiento registrado ✓');
    } catch (e) {
      showToast('Error al registrar el movimiento: ' + e.message);
    }
  };

  const handleBorrarMovimiento = async (id) => {
    try {
      await db.deleteMovimiento(id);
      setMovimientos(prev => prev.filter(m => m.id !== id));
      showToast('Movimiento eliminado');
    } catch (e) {
      showToast('Error al eliminar: ' + e.message);
    }
  };
```

- [ ] **Step 4: Props a Ganancias**

Reemplazar el render de `<Ganancias ... />` por:

```jsx
        {visited.has('ganancias') && <div style={{ display: screen === 'ganancias' ? 'block' : 'none' }}><Ganancias ventas={ventas} comisiones={comisiones} negocios={negocios} miNegocioId={session?.user?.app_metadata?.negocio_id || null} movimientos={movimientos} onSetPagado={handleSetPagado} onSaldarTodo={handleSaldarTodo} onCrearMovimiento={handleCrearMovimiento} onBorrarMovimiento={handleBorrarMovimiento} /></div>}
```

- [ ] **Step 5: Build + commit**

Run: `npm run build` → Expected: `✓ built`

```bash
git add src/App.jsx
git commit -m "feat: estado y handlers de cuenta corriente en App"
```

---

### Task 4: Componente `CuentaCorrienteModal`

**Files:**
- Create: `src/components/CuentaCorrienteModal.jsx`

**Interfaces:**
- Consumes: props de Task 3 (`onSetPagado`, `onSaldarTodo`, `onCrearMovimiento`, `onBorrarMovimiento`) + `negocio` ({id, nombre} de la contraparte), `miNegocioId`, `comisiones`, `movimientos`, `onClose`.
- Produces: `export default CuentaCorrienteModal` — lo importa Ganancias en Task 5.

- [ ] **Step 1: Escribir el componente completo**

```jsx
import { useState } from 'react';
import { fUSD } from '../lib/utils.js';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });
const SERIF = (size, color = '#eef2f7') => ({ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, color });

function isoHoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const labelDe = (iso) => iso ? iso.split('-').reverse().join('/') : '';

const input = {
  padding: '8px 11px', borderRadius: 9, background: '#1e2228',
  border: '1px solid rgba(231,238,246,0.12)', color: '#eef2f7', fontSize: 13,
  fontFamily: "'Hanken Grotesk', sans-serif", colorScheme: 'dark',
};
const btn = (color, solid = false) => ({
  padding: '6px 14px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer', fontWeight: 600,
  fontFamily: "'Hanken Grotesk', sans-serif",
  border: `1px solid ${color}55`, background: solid ? color : `${color}14`,
  color: solid ? '#14171c' : color,
});

export default function CuentaCorrienteModal({ negocio, miNegocioId, comisiones, movimientos, onSetPagado, onSaldarTodo, onCrearMovimiento, onBorrarMovimiento, onClose }) {
  const [filtro, setFiltro] = useState('pendientes');
  const [confirmSaldar, setConfirmSaldar] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [dir, setDir] = useState('meDebe');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(isoHoy());
  const [error, setError] = useState('');

  // Solo las operaciones entre mi negocio y esta contraparte
  const esPar = (a, b) => (a === negocio.id && b === miNegocioId) || (a === miNegocioId && b === negocio.id);

  const items = [
    ...comisiones
      .filter(c => esPar(c.negocioDuenio, c.negocioVendedor))
      .map(c => ({
        tipo: 'comision', id: c.id, fechaNum: c.fechaNum, fechaLabel: c.fechaLabel,
        concepto: c.equipo,
        detalle: [c.capital > 0 ? `capital ${fUSD(c.capital)}` : '', c.monto > 0 ? `com. ${fUSD(c.monto)}` : ''].filter(Boolean).join(' + '),
        total: c.monto + c.capital,
        soyAcreedor: c.negocioDuenio === miNegocioId,
        pagado: c.pagado, pagadoEn: c.pagadoEn, borrable: false,
      })),
    ...movimientos
      .filter(m => esPar(m.negocioDeudor, m.negocioAcreedor))
      .map(m => ({
        tipo: 'movimiento', id: m.id, fechaNum: m.fechaNum, fechaLabel: m.fechaLabel,
        concepto: m.concepto, detalle: 'movimiento manual',
        total: m.monto,
        soyAcreedor: m.negocioAcreedor === miNegocioId,
        pagado: m.pagado, pagadoEn: m.pagadoEn,
        borrable: m.creadoPor === miNegocioId && !m.pagado,
      })),
  ].sort((a, b) => b.fechaNum - a.fechaNum);

  const pendientes = items.filter(i => !i.pagado);
  const saldo = pendientes.reduce((a, i) => a + (i.soyAcreedor ? i.total : -i.total), 0);
  const aMiFavor = pendientes.filter(i => i.soyAcreedor);
  const visibles = filtro === 'todas' ? items : items.filter(i => filtro === 'pendientes' ? !i.pagado : i.pagado);

  const submitMovimiento = () => {
    const m = parseFloat(monto);
    if (!concepto.trim()) { setError('Poné un concepto (ej: Calefactor 50/50)'); return; }
    if (!m || m <= 0) { setError('El monto debe ser mayor a 0'); return; }
    setError('');
    onCrearMovimiento({
      fecha,
      concepto: concepto.trim(),
      monto: Math.round(m * 100) / 100,
      negocioDeudor: dir === 'meDebe' ? negocio.id : miNegocioId,
      negocioAcreedor: dir === 'meDebe' ? miNegocioId : negocio.id,
    });
    setConcepto(''); setMonto(''); setFecha(isoHoy()); setShowForm(false);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,12,15,0.75)', backdropFilter: 'blur(3px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 680, maxHeight: '88vh', overflowY: 'auto', background: '#181b20', borderRadius: 18, border: '1px solid rgba(231,238,246,0.1)', padding: '24px 26px' }}>

        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
          <div>
            <div style={{ ...MONO(10), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 7 }}>Cuenta corriente</div>
            <div style={{ ...SERIF(26), lineHeight: 1.1 }}>{negocio.nombre}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#828a94', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ marginBottom: 18 }}>
          <span style={{ ...SERIF(22, saldo > 0 ? '#82b39d' : saldo < 0 ? '#d98a76' : '#828a94') }}>
            {saldo > 0 ? `te debe ${fUSD(saldo)}` : saldo < 0 ? `le debés ${fUSD(-saldo)}` : 'están al día'}
          </span>
          {pendientes.length > 0 && <span style={{ fontSize: 12, color: '#6a717b', marginLeft: 10 }}>{pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}</span>}
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button onClick={() => { setShowForm(!showForm); setError(''); }} style={btn('#74a8d6')}>
            {showForm ? 'Cancelar' : '+ Agregar movimiento'}
          </button>
          {aMiFavor.length > 0 && !confirmSaldar && (
            <button onClick={() => setConfirmSaldar(true)} style={btn('#82b39d')}>
              Saldar todo ({aMiFavor.length})
            </button>
          )}
          {confirmSaldar && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#d9b876' }}>
              ¿Marcar {aMiFavor.length} línea{aMiFavor.length !== 1 ? 's' : ''} como pagada{aMiFavor.length !== 1 ? 's' : ''}?
              <button onClick={() => { onSaldarTodo(aMiFavor.map(i => ({ tipo: i.tipo, id: i.id }))); setConfirmSaldar(false); }} style={btn('#82b39d', true)}>Sí, saldar</button>
              <button onClick={() => setConfirmSaldar(false)} style={btn('#828a94')}>No</button>
            </span>
          )}
        </div>

        {/* Form de movimiento manual */}
        {showForm && (
          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(116,168,214,0.05)', border: '1px solid rgba(116,168,214,0.2)', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[['meDebe', `${negocio.nombre} me debe`], ['leDebo', `le debo a ${negocio.nombre}`]].map(([k, label]) => (
                <button key={k} onClick={() => setDir(k)}
                  style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer', border: 'none', fontFamily: "'Hanken Grotesk', sans-serif", background: dir === k ? (k === 'meDebe' ? '#82b39d' : '#d98a76') : 'rgba(231,238,246,0.06)', color: dir === k ? '#14171c' : '#828a94', fontWeight: dir === k ? 600 : 400 }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Concepto (ej: Calefactor 50/50)" style={{ ...input, flex: 1, minWidth: 180 }} />
              <span style={{ fontSize: 12.5, color: '#828a94' }}>US$</span>
              <input value={monto} onChange={e => setMonto(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0" style={{ ...input, width: 80 }} />
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={input} />
              <button onClick={submitMovimiento} style={btn('#74a8d6', true)}>Registrar</button>
            </div>
            {error && <div style={{ marginTop: 8, fontSize: 12.5, color: '#d98a76' }}>{error}</div>}
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[['pendientes', 'Pendientes'], ['pagadas', 'Pagadas'], ['todas', 'Todas']].map(([k, label]) => (
            <button key={k} onClick={() => setFiltro(k)}
              style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: "'Hanken Grotesk', sans-serif", background: filtro === k ? '#74a8d6' : 'rgba(231,238,246,0.06)', color: filtro === k ? '#14171c' : '#828a94', fontWeight: filtro === k ? 600 : 400 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {visibles.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#6a717b', fontSize: 13 }}>
            Sin operaciones {filtro === 'pendientes' ? 'pendientes' : filtro === 'pagadas' ? 'pagadas' : ''} con {negocio.nombre}.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibles.map(i => (
            <div key={`${i.tipo}-${i.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '9px 12px', borderRadius: 10, background: 'rgba(231,238,246,0.02)', border: '1px solid rgba(231,238,246,0.06)', opacity: i.pagado ? 0.65 : 1 }}>
              <span style={{ ...MONO(11), flexShrink: 0 }}>{i.fechaLabel}</span>
              <span style={{ flex: 1, minWidth: 140, fontSize: 13, color: '#eef2f7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {i.concepto}
                <span style={{ color: '#6a717b', fontSize: 11.5, marginLeft: 8 }}>{i.detalle}</span>
              </span>
              <span style={{ fontWeight: 600, fontSize: 13.5, color: i.soyAcreedor ? '#82b39d' : '#d98a76', whiteSpace: 'nowrap' }}>
                {i.soyAcreedor ? '+' : '−'}{fUSD(i.total)}
              </span>
              {i.pagado ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: '#82b39d' }}>✓ Pagada el {labelDe(i.pagadoEn)}</span>
                  {i.soyAcreedor && (
                    <button onClick={() => onSetPagado(i.tipo, i.id, false)} style={{ ...btn('#828a94'), padding: '3px 9px', fontSize: 11 }}>Desmarcar</button>
                  )}
                </span>
              ) : i.soyAcreedor ? (
                <button onClick={() => onSetPagado(i.tipo, i.id, true)} style={{ ...btn('#82b39d'), padding: '4px 11px', fontSize: 11.5 }}>Marcar pagada</button>
              ) : (
                <span style={{ fontSize: 11, color: '#d9b876' }}>pendiente</span>
              )}
              {i.borrable && (
                <button onClick={() => onBorrarMovimiento(i.id)} title="Eliminar movimiento" style={{ background: 'none', border: 'none', color: '#d98a76', cursor: 'pointer', fontSize: 14, padding: 2 }}>🗑</button>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: '#6a717b' }}>
          Los pagos los confirma solo el que cobra. Las comisiones se saldan con capital y comisión juntos; para corregir un movimiento manual, borralo y cargalo de nuevo.
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build` → Expected: `✓ built` (el componente aún no se usa; el build valida sintaxis)

- [ ] **Step 3: Commit**

```bash
git add src/components/CuentaCorrienteModal.jsx
git commit -m "feat: modal de cuenta corriente con pagos y movimientos manuales"
```

---

### Task 5: Integrar en `Ganancias.jsx`

**Files:**
- Modify: `src/screens/Ganancias.jsx` — import, firma de props, estado (~línea 31), bloque de cuenta corriente (líneas ~194-260), render del modal al final

**Interfaces:**
- Consumes: `CuentaCorrienteModal` (Task 4), props de App (Task 3).
- Produces: UI final — fila por negocio con saldo del período + pendiente de pago + botón que abre el modal. El detalle expandible viejo (`detalleNegocio`) se elimina.

- [ ] **Step 1: Import y props**

```js
import CuentaCorrienteModal from '../components/CuentaCorrienteModal.jsx';
```

Firma del componente:

```js
export default function Ganancias({ ventas, comisiones = [], negocios = [], miNegocioId = null, movimientos = [], onSetPagado, onSaldarTodo, onCrearMovimiento, onBorrarMovimiento }) {
```

- [ ] **Step 2: Reemplazar el estado `detalleNegocio`**

```js
  const [ccNegocio, setCcNegocio] = useState(null);  // contraparte abierta en el modal
```

(Eliminar `detalleNegocio`/`setDetalleNegocio`; ya no se usan.)

- [ ] **Step 3: Reemplazar el bloque completo de cuenta corriente** (el IIFE `{(() => { const sumar = ... })()}` de ~66 líneas) por:

```jsx
      {/* Cuenta corriente entre negocios: saldo del período + deuda pendiente real */}
      {(() => {
        const sumar = (lista, duenio, vendedor) => lista
          .filter(c => c.negocioDuenio === duenio && c.negocioVendedor === vendedor)
          .reduce((a, b) => a + b.monto + b.capital, 0);
        const filas = negocios.filter(n => n.id !== miNegocioId).map(n => {
          const esPar = (a, b) => (a === n.id && b === miNegocioId) || (a === miNegocioId && b === n.id);
          const comPar = comisiones.filter(c => esPar(c.negocioDuenio, c.negocioVendedor));
          const movPar = movimientos.filter(m => esPar(m.negocioDeudor, m.negocioAcreedor));
          const pendiente =
            comPar.filter(c => !c.pagado).reduce((a, c) => a + (c.negocioDuenio === miNegocioId ? 1 : -1) * (c.monto + c.capital), 0)
            + movPar.filter(m => !m.pagado).reduce((a, m) => a + (m.negocioAcreedor === miNegocioId ? 1 : -1) * m.monto, 0);
          const saldoPeriodo = sumar(comisEnRango, miNegocioId, n.id) - sumar(comisEnRango, n.id, miNegocioId);
          return { n, saldoPeriodo, pendiente, actividad: comPar.length + movPar.length };
        }).filter(f => f.actividad > 0);
        if (filas.length === 0) return null;
        return (
          <div style={{ padding: '20px 24px', borderRadius: 16, border: '1px solid rgba(231,238,246,0.1)', background: '#181b20', marginBottom: 20 }}>
            <div style={{ ...MONO(10), letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>Cuenta corriente entre negocios</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filas.map(({ n, saldoPeriodo, pendiente }) => (
                <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#eef2f7' }}>{n.nombre}</span>
                  <span style={{ fontSize: 12, color: '#828a94', whiteSpace: 'nowrap' }}>
                    saldo del período: <span style={{ color: saldoPeriodo >= 0 ? '#82b39d' : '#d98a76' }}>{saldoPeriodo >= 0 ? '+' : '−'}{fUSD(Math.abs(saldoPeriodo))}</span>
                  </span>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: pendiente > 0 ? '#82b39d' : pendiente < 0 ? '#d98a76' : '#828a94', whiteSpace: 'nowrap' }}>
                    {pendiente > 0 ? `te debe ${fUSD(pendiente)}` : pendiente < 0 ? `le debés ${fUSD(-pendiente)}` : 'al día'}
                  </span>
                  <button onClick={() => setCcNegocio(n)}
                    style={{ padding: '5px 13px', borderRadius: 8, border: '1px solid rgba(116,168,214,0.35)', background: 'rgba(116,168,214,0.08)', color: '#74a8d6', fontSize: 12.5, cursor: 'pointer', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600 }}>
                    Ver cuenta corriente →
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
```

- [ ] **Step 4: Render del modal** — antes del `</div>` final del return:

```jsx
      {ccNegocio && (
        <CuentaCorrienteModal
          negocio={ccNegocio}
          miNegocioId={miNegocioId}
          comisiones={comisiones}
          movimientos={movimientos}
          onSetPagado={onSetPagado}
          onSaldarTodo={onSaldarTodo}
          onCrearMovimiento={onCrearMovimiento}
          onBorrarMovimiento={onBorrarMovimiento}
          onClose={() => setCcNegocio(null)}
        />
      )}
```

- [ ] **Step 5: Build + commit**

Run: `npm run build` → Expected: `✓ built`

```bash
git add src/screens/Ganancias.jsx
git commit -m "feat: cuenta corriente con pendiente de pago y modal desde Ganancias"
```

---

### Task 6: QA con agent-browser, docs y push

**Files:**
- Modify: `docs/referencia.md` (sección Multi-usuario + tabla de modelo de datos)

**Interfaces:**
- Consumes: BD dev migrada (gate de Task 1), dev server local, usuarios de prueba.

- [ ] **Step 1: Confirmar que la migración corrió en iconic-dev** (gate de Task 1). Si no, pedírsela a Maxi y esperar.

- [ ] **Step 2: Levantar dev y correr la QA del spec**

```bash
npm run dev   # en background
agent-browser open http://localhost:5173
```

Escenarios (del spec, sección Verificación):
1. Como eli: vender un equipo de Iconic con comisión manual → en Ganancias, la fila de Iconic muestra la deuda; abrir el modal → línea pendiente con capital + com.
2. Como chacho: misma línea visible, con botón "Marcar pagada" (es el acreedor). Como eli: sin botón (chip "pendiente").
3. chacho marca pagada → en ambos usuarios el pendiente baja; la "Ganancia neta del período" de ambos NO cambia.
4. Como eli: "+ Agregar movimiento" en ambas direcciones ("me debe" y "le debo") → saldo neto correcto de los dos lados.
5. eli borra un manual propio pendiente (🗑 visible solo ahí); en los del otro y en comisiones no hay 🗑.
6. Con varias pendientes a favor: "Saldar todo" → confirmación inline → todas pagadas.
7. Filtros Pendientes/Pagadas/Todas y "Desmarcar" del acreedor.

Notas de herramienta: clicks por `textContent` vía eval (los refs quedan stale), `scrollintoview` antes de clickear dentro del modal, inputs de fecha React necesitan native setter + evento `input`.

- [ ] **Step 3: Actualizar `docs/referencia.md`**

En la sección Multi-usuario, en el bullet de comisiones, reemplazar el tramo "Todo se acumula en la **cuenta corriente** de Ganancias (saldo por negocio + detalle de operaciones); informativa, sin estados de pago." por:

```markdown
Todo se acumula en la **cuenta corriente** de Ganancias: por negocio se ve el saldo del período y la deuda pendiente, y un modal muestra el detalle completo. Los pagos los confirma **solo el acreedor** (marcar/desmarcar línea por línea o "Saldar todo"); lo pagado se descuenta del pendiente pero no cambia las ganancias (son devengadas). También se pueden cargar **movimientos manuales** en ambas direcciones para deudas fuera de la app (ej. "Calefactor 50/50") — cuentan en la deuda, no en las ganancias, y los borra solo quien los creó.
```

En la tabla de modelo de datos, agregar:

```markdown
| `comisiones` | venta_id, equipo_label, monto (comisión), capital, negocio_duenio, negocio_vendedor, fecha, pagado, pagado_en |
| `movimientos` | fecha, concepto, monto, negocio_deudor, negocio_acreedor, creado_por, pagado, pagado_en |
```

- [ ] **Step 4: Commit de docs, push y cierre**

```bash
git add docs/referencia.md
git commit -m "docs: cuenta corriente con pagos y movimientos manuales"
git push
```

Recordar en el mensaje final: al mergear a master, correr las 6 migraciones en prod en orden (garantia → multitenant → stock-global → comisiones → comision-capital → **cuenta-corriente**).
