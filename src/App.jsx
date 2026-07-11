import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase.js';
import * as db from './lib/db.js';
import { TC as TC_DEFAULT, esPhone } from './data/data.js';
import Header from './components/Header.jsx';
import Toast from './components/Toast.jsx';
import Login from './screens/Login.jsx';
import Resumen from './screens/Resumen.jsx';
import Stock from './screens/Stock.jsx';
import Venta from './screens/Venta.jsx';
import Cobros from './screens/Cobros.jsx';
import Reservas from './screens/Reservas.jsx';
import Clientes from './screens/Clientes.jsx';
import Ventas from './screens/Ventas.jsx';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession]   = useState(undefined);
  const screen = location.pathname.replace('/', '') || 'resumen';
  const [visited, setVisited]   = useState(() => new Set([screen]));
  const [toast, setToast]       = useState(null);
  const [equipos, setEquipos]   = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ventas, setVentas]     = useState([]);
  const [cobros, setCobros]     = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tc, setTc]             = useState(() => {
    const saved = localStorage.getItem('tc_dia');
    return saved ? parseInt(saved, 10) : TC_DEFAULT;
  });
  const toastTimer = useRef(null);

  const updateTC = (newTc) => {
    const n = parseInt(newTc, 10);
    if (!isNaN(n) && n > 0) {
      setTc(n);
      localStorage.setItem('tc_dia', String(n));
    }
  };

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Carga inicial — depende del userId para no volver a cargar en token refresh
  const userId = session?.user?.id;
  useEffect(() => {
    if (session === undefined) return;
    if (!session || !userId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      db.fetchEquipos(),
      db.fetchClientes(),
      db.fetchVentas(),
      db.fetchCobros(),
      db.fetchReservas(),
    ])
      .then(([eqs, cls, vts, cbs, rvs]) => {
        setEquipos(eqs);
        setClientes(cls);
        setVentas(vts);
        setCobros(cbs);
        setReservas(rvs);
      })
      .catch(err => showToast('Error al cargar datos: ' + err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const go = (s) => {
    setVisited(prev => prev.has(s) ? prev : new Set([...prev, s]));
    navigate('/' + s);
  };

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3400);
  };

  // ─── EQUIPOS ─────────────────────────────────────────────────────────────

  const addEquipo = async (item) => {
    try {
      const nuevo = await db.createEquipo(item);
      setEquipos(prev => [nuevo, ...prev]);
      showToast('Producto agregado al stock');
    } catch (e) {
      showToast('Error al agregar: ' + e.message);
    }
  };

  const updateEquipo = async (id, updates) => {
    try {
      const updated = await db.updateEquipo(id, updates);
      setEquipos(prev => prev.map(e => e.id === id ? updated : e));
      showToast('Producto actualizado');
    } catch (e) {
      showToast('Error al actualizar: ' + e.message);
    }
  };

  const deleteEquipo = async (id) => {
    try {
      await db.deleteEquipo(id);
      setEquipos(prev => prev.filter(e => e.id !== id));
      showToast('Equipo eliminado del stock');
    } catch (e) {
      showToast('Error al eliminar equipo: ' + e.message);
    }
  };

  // ─── CLIENTES ─────────────────────────────────────────────────────────────

  const addCliente = async (data) => {
    try {
      const nuevo = await db.createCliente(data);
      setClientes(prev => [nuevo, ...prev]);
      return nuevo;
    } catch (e) {
      showToast('Error al registrar cliente: ' + e.message);
      const fallback = {
        id: 'local_' + Date.now(),
        nombre: data.nombre,
        inicial: data.nombre.trim()[0].toUpperCase(),
        dni: data.dni || '', tel: data.tel || '', loc: data.loc || '',
        desde: data.desde || '', compras: [], plan: null, reclamos: [],
      };
      setClientes(prev => [...prev, fallback]);
      return fallback;
    }
  };

  const editCliente = async (id, data) => {
    try {
      const updated = await db.updateCliente(id, data);
      setClientes(prev => prev.map(c => c.id === id ? { ...updated, compras: c.compras, plan: c.plan } : c));
      showToast('Cliente actualizado');
    } catch (e) {
      showToast('Error al actualizar cliente: ' + e.message);
    }
  };

  const deleteCliente = async (id) => {
    try {
      await db.deleteCliente(id);
      setClientes(prev => prev.filter(c => c.id !== id));
      showToast('Cliente eliminado');
    } catch (e) {
      showToast('Error al eliminar cliente: ' + e.message);
    }
  };

  // ─── RECLAMOS ─────────────────────────────────────────────────────────────

  const addReclamo = async (clienteId, reclamo) => {
    try {
      const nuevo = await db.createReclamo(clienteId, reclamo);
      setClientes(prev => prev.map(c =>
        c.id === clienteId ? { ...c, reclamos: [...(c.reclamos || []), nuevo] } : c
      ));
      showToast('Reclamo registrado');
    } catch (e) {
      showToast('Error al registrar reclamo: ' + e.message);
    }
  };

  const updateReclamo = async (clienteId, reclamoId, updates) => {
    try {
      await db.updateReclamo(reclamoId, updates);
      setClientes(prev => prev.map(c =>
        c.id === clienteId
          ? { ...c, reclamos: c.reclamos.map(r => r.id === reclamoId ? { ...r, ...updates } : r) }
          : c
      ));
      showToast('Reclamo actualizado');
    } catch (e) {
      showToast('Error al actualizar reclamo: ' + e.message);
    }
  };

  // ─── VENTAS ──────────────────────────────────────────────────────────────

  const updateVenta = async (id, updates) => {
    try {
      await db.updateVenta(id, updates);
      setVentas(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    } catch (e) {
      showToast('Error al actualizar venta: ' + e.message);
    }
  };

  const handleConfirmVenta = async (ventaData) => {
    try {
      const nueva = await db.createVenta(ventaData);
      // Generar cuotas si corresponde
      if (ventaData.modalidad === 'cuotas') {
        const nuevosC = await db.generateCobros(nueva.id, ventaData);
        if (nuevosC) setCobros(prev => [...prev, ...nuevosC]);
        // Recargar cobros para tener los IDs correctos
        db.fetchCobros().then(cbs => setCobros(cbs));
      }
      // Actualizar equipos vendidos (soporta carrito multi-item via lineas)
      const lineasVenta = ventaData.lineas && ventaData.lineas.length > 0 ? ventaData.lineas : (ventaData.equipoId ? [{ equipoId: ventaData.equipoId, cantidad: 1 }] : []);
      for (const l of lineasVenta) {
        const eid = l.equipoId;
        if (!eid) continue;
        const eq = equipos.find(e => e.id === eid);
        if (!eq) continue;
        const qtySold = l.cantidad || 1;
        if (!esPhone(eq.categoria) && eq.cantidad > qtySold) {
          await db.updateEquipo(eid, { ...eq, cantidad: eq.cantidad - qtySold });
        } else {
          await db.updateEquipo(eid, { ...eq, estado: 'vendido' });
        }
      }
      setEquipos(prev => prev.map(e => {
        const l = lineasVenta.find(lv => lv.equipoId === e.id);
        if (!l) return e;
        const qty = l.cantidad || 1;
        if (!esPhone(e.categoria) && e.cantidad > qty) return { ...e, cantidad: e.cantidad - qty };
        return { ...e, estado: 'vendido' };
      }));
      // Agregar equipo de canje al stock
      if (ventaData.canje && ventaData.canjeEquipoData) {
        const eqCanje = await db.createEquipo(ventaData.canjeEquipoData);
        setEquipos(prev => [eqCanje, ...prev]);
      }
      setVentas(prev => [nueva, ...prev]);
      showToast('Venta registrada con éxito');
      setTimeout(() => go('ventas'), 300);
    } catch (e) {
      showToast('Error al registrar venta: ' + e.message);
    }
  };

  // ─── RESERVAS ─────────────────────────────────────────────────────────────

  const addReserva = async (data) => {
    try {
      const nueva = await db.createReserva(data);
      setReservas(prev => [nueva, ...prev]);
      showToast('Reserva registrada');
    } catch (e) {
      showToast('Error al registrar reserva: ' + e.message);
    }
  };

  const handleConfirmApartado = async (reservaData) => {
    try {
      if (reservaData.equipoId) {
        const eq = equipos.find(e => e.id === reservaData.equipoId);
        if (eq && eq.estado === 'reservado') {
          showToast('Este equipo ya tiene una reserva activa.');
          return;
        }
      }
      const nueva = await db.createReserva(reservaData);
      setReservas(prev => [nueva, ...prev]);
      if (reservaData.equipoId) {
        const eq = equipos.find(e => e.id === reservaData.equipoId);
        if (eq) {
          await db.updateEquipo(reservaData.equipoId, { ...eq, estado: 'reservado' });
          setEquipos(prev => prev.map(e => e.id === reservaData.equipoId ? { ...e, estado: 'reservado' } : e));
        }
      }
      showToast('Reserva registrada con éxito');
      setTimeout(() => go('reservas'), 300);
    } catch (e) {
      showToast('Error al registrar reserva: ' + e.message);
    }
  };

  const handleCancelReserva = async (reservaId, equipoId) => {
    try {
      await db.updateReservaEstado(reservaId, 'cancelada');
      setReservas(prev => prev.map(r => r.id === reservaId ? { ...r, estado: 'cancelada' } : r));
      if (equipoId) {
        const eq = equipos.find(e => e.id === equipoId);
        if (eq) {
          await db.updateEquipo(equipoId, { ...eq, estado: 'disponible' });
          setEquipos(prev => prev.map(e => e.id === equipoId ? { ...e, estado: 'disponible' } : e));
        }
      }
      showToast('Reserva cancelada' + (equipoId ? ' · equipo liberado al stock' : ''));
    } catch (e) {
      showToast('Error al cancelar reserva: ' + e.message);
    }
  };

  const handleDeleteVenta = async (id) => {
    try {
      await db.deleteVenta(id);
      setVentas(prev => prev.filter(v => v.id !== id));
      showToast('Venta eliminada');
    } catch (e) {
      showToast('Error al eliminar venta: ' + e.message);
    }
  };

  const handleDeleteReserva = async (id, equipoId) => {
    try {
      await db.deleteReserva(id);
      setReservas(prev => prev.filter(r => r.id !== id));
      if (equipoId) {
        const eq = equipos.find(e => e.id === equipoId);
        if (eq && eq.estado === 'reservado') {
          await db.updateEquipo(equipoId, { ...eq, estado: 'disponible' });
          setEquipos(prev => prev.map(e => e.id === equipoId ? { ...e, estado: 'disponible' } : e));
        }
      }
      showToast('Reserva eliminada');
    } catch (e) {
      showToast('Error al eliminar reserva: ' + e.message);
    }
  };

  const convertReserva = async (reservaId, ventaData) => {
    try {
      await db.updateReservaEstado(reservaId, 'convertida');
      setReservas(prev => prev.map(r => r.id === reservaId ? { ...r, estado: 'convertida' } : r));
    } catch (e) {
      // Reserva podría ser de datos iniciales sin UUID
    }
    await handleConfirmVenta(ventaData);
  };

  // ─── COBROS ──────────────────────────────────────────────────────────────

  const updateCobroEstado = async (id, estado) => {
    try {
      await db.updateCobroEstado(id, estado);
      setCobros(prev => prev.map(c => c.id === id ? { ...c, estado } : c));
    } catch (e) {
      showToast('Error al actualizar cobro: ' + e.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ─── Derivar compras por cliente desde ventas ────────────────────────────
  // La tabla clientes no guarda compras; se derivan de ventas en tiempo real.

  const clientesConCompras = useMemo(() =>
    clientes.map(c => ({
      ...c,
      compras: ventas
        .filter(v => v.clienteId === c.id || v.cliente === c.nombre)
        .map(v => {
          const parts = v.equipo.split(' · ');
          const gPartes = v.garantiaVence ? v.garantiaVence.split('-').map(Number) : null;
          return {
            modelo:         parts[0] || v.equipo,
            cap:            parts[1] || '',
            color:          parts[2] || '',
            imei:           v.imei || '',
            cond:           'Nuevo',
            bat:            null,
            usd:            v.usd,
            fecha:          v.fechaLabel,
            garantiaUrl:    v.garantiaUrl || null,
            garantiaNombre: v.garantiaNombre || null,
            gVence: gPartes
              ? { y: gPartes[0], m: gPartes[1], d: gPartes[2] }
              : { y: 2099, m: 1, d: 1 },
            // Datos para el modal de detalle
            ventaId:    v.id,
            equipo:     v.equipo,
            lineas:     v.lineas || null,
            modalidad:  v.modalidad,
            metodo:     v.metodo,
            cuotas:     v.cuotas || null,
            cuotaMonto: v.cuotaMonto || null,
            anticipo:   v.anticipo || null,
            canje:      v.canje || false,
            canjeEquipo: v.canjeEquipo || null,
            canjeValor:  v.canjeValor || null,
            tc:         v.tc || TC_DEFAULT,
            cliente:    v.cliente,
          };
        }),
    })),
    [clientes, ventas]
  );

  // ─── Renders ─────────────────────────────────────────────────────────────

  if (session === undefined) return null;

  if (!session) return <Login onLogin={setSession} />;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#121417', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a717b', fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14 }}>
        Cargando datos…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(120% 80% at 80% -12%, #1d232a 0%, #121417 54%)', color: '#eef2f7', fontFamily: "'Hanken Grotesk', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <Header screen={screen} onNav={go} onLogout={handleLogout} />
      <main style={{ flex: 1, width: '100%', maxWidth: 1320, margin: '0 auto', padding: '38px 32px 80px' }}>
        {visited.has('resumen')  && <div style={{ display: screen === 'resumen'  ? 'block' : 'none' }}><Resumen equipos={equipos} ventas={ventas} cobros={cobros} reservas={reservas} tc={tc} onUpdateTC={updateTC} onGoCobros={() => go('cobros')} /></div>}
        {visited.has('stock')    && <div style={{ display: screen === 'stock'    ? 'block' : 'none' }}><Stock equipos={equipos} tc={tc} onAdd={addEquipo} onUpdate={updateEquipo} onDelete={deleteEquipo} /></div>}
        {visited.has('venta')    && <div style={{ display: screen === 'venta'    ? 'block' : 'none' }}><Venta equipos={equipos} clientes={clientesConCompras} tc={tc} onConfirm={handleConfirmVenta} onConfirmApartado={handleConfirmApartado} onAddCliente={addCliente} /></div>}
        {visited.has('cobros')   && <div style={{ display: screen === 'cobros'   ? 'block' : 'none' }}><Cobros cobros={cobros} ventas={ventas} onUpdateEstado={updateCobroEstado} /></div>}
        {visited.has('reservas') && <div style={{ display: screen === 'reservas' ? 'block' : 'none' }}><Reservas reservas={reservas} equipos={equipos} onConvert={convertReserva} onCancelReserva={handleCancelReserva} onDeleteReserva={handleDeleteReserva} /></div>}
        {visited.has('clientes') && <div style={{ display: screen === 'clientes' ? 'block' : 'none' }}><Clientes clientes={clientesConCompras} reservas={reservas} onAddReclamo={addReclamo} onUpdateReclamo={updateReclamo} onEditCliente={editCliente} onDeleteCliente={deleteCliente} /></div>}
        {visited.has('ventas')   && <div style={{ display: screen === 'ventas'   ? 'block' : 'none' }}><Ventas ventas={ventas} tc={tc} onUpdateVenta={updateVenta} onDeleteVenta={handleDeleteVenta} onError={showToast} /></div>}
      </main>
      <Toast msg={toast} />
    </div>
  );
}
