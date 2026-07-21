import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase.js';
import * as db from './lib/db.js';
import { TC as TC_DEFAULT } from './lib/utils.js';
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
import Ganancias from './screens/Ganancias.jsx';

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
  const [vendedores, setVendedores] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [comisiones, setComisiones] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
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
      db.fetchVendedores().catch(() => []),  // tabla nueva: tolerar BD sin migrar
      db.fetchNegocios().catch(() => []),
      db.fetchComisiones().catch(() => []),
      db.fetchMovimientos().catch(() => []),
    ])
      .then(([eqs, cls, vts, cbs, rvs, vds, ngs, cms, movs]) => {
        setNegocios(ngs);
        setComisiones(cms);
        setMovimientos(movs);
        setEquipos(eqs);
        setClientes(cls);
        setVentas(vts);
        setCobros(cbs);
        setReservas(rvs);
        setVendedores(vds);
      })
      .catch(err => {
        // Sesión vieja inválida (token vencido/revocado): volver al login
        // en silencio en vez de mostrar un error que se resuelve solo
        if (err?.status === 401 || /JWT|token|Unauthorized/i.test(err?.message || '')) {
          supabase.auth.signOut();
          return;
        }
        showToast('Error al cargar datos: ' + err.message);
      })
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
      return null;
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
      const miNegocio = session?.user?.app_metadata?.negocio_id || null;
      // La venta se crea de forma atómica (función Postgres crear_venta):
      // venta + items + stock + cobros + comisiones en una sola transacción.
      await db.createVenta(ventaData, equipos, miNegocio);
      // Recargar los slices afectados desde la BD
      const [vts, eqs, cbs, cms] = await Promise.all([
        db.fetchVentas(),
        db.fetchEquipos(),
        db.fetchCobros(),
        db.fetchComisiones().catch(() => comisiones),
      ]);
      setVentas(vts);
      setEquipos(eqs);
      setCobros(cbs);
      setComisiones(cms);
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
      const venta = ventas.find(v => v.id === id);
      const stockRestores = venta ? db.buildStockRestores(venta, equipos) : [];
      // Borrado atómico: restaura stock y borra cobros/comisiones/venta en una transacción
      await db.deleteVenta(id, stockRestores);
      const [vts, eqs, cbs] = await Promise.all([db.fetchVentas(), db.fetchEquipos(), db.fetchCobros()]);
      setVentas(vts);
      setEquipos(eqs);
      setCobros(cbs);
      setComisiones(prev => prev.filter(c => c.ventaId !== id));
      showToast('Venta eliminada');
    } catch (e) {
      showToast('Error al eliminar venta: ' + e.message);
    }
  };

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

  const handleSaveVendedor = async (v) => {
    try {
      await db.saveVendedor(v);
      setVendedores(prev => [...prev.filter(x => x.numero !== v.numero), v].sort((a, b) => a.numero - b.numero));
      showToast('Vendedor guardado');
    } catch (e) {
      showToast('Error al guardar vendedor: ' + e.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ─── Derivar compras por cliente desde ventas ────────────────────────────
  // La tabla clientes no guarda compras; se derivan de ventas en tiempo real.

  const clientesConCompras = useMemo(() =>
    clientes.map(c => {
      // Vincular por ID; el nombre solo es fallback para ventas viejas sin cliente_id
      const ventasCli = ventas.filter(v => v.clienteId ? v.clienteId === c.id : v.cliente === c.nombre);
      const idsVentas = new Set(ventasCli.map(v => v.id));
      const cobrosCli = cobros.filter(cb => idsVentas.has(cb.ventaId));

      // Saldo real: suma de cuotas no cobradas (USD)
      const saldoPendiente = cobrosCli
        .filter(cb => cb.estado !== 'cobrada')
        .reduce((a, b) => a + b.monto, 0);

      // Plan activo: la venta en cuotas más reciente con cuotas sin cobrar
      let plan = null;
      const ventasCuotas = ventasCli
        .filter(v => v.modalidad === 'cuotas')
        .sort((a, b) => b.fechaNum - a.fechaNum);
      for (const v of ventasCuotas) {
        const cbs = cobrosCli
          .filter(cb => cb.ventaId === v.id)
          .sort((a, b) => (a.y * 10000 + a.m * 100 + a.d) - (b.y * 10000 + b.m * 100 + b.d));
        if (cbs.length === 0) continue;
        const pagadas = cbs.filter(cb => cb.estado === 'cobrada').length;
        if (pagadas >= cbs.length) continue;
        const prox = cbs.find(cb => cb.estado !== 'cobrada');
        const vencida = cbs.find(cb => cb.estado === 'vencida');
        plan = {
          equipo: v.equipo,
          total: cbs.length,
          pagadas,
          monto: v.cuotaMonto || cbs[0].monto || 0,
          restante: cbs.filter(cb => cb.estado !== 'cobrada').reduce((a, b) => a + b.monto, 0),
          prox: prox ? `${prox.d}/${prox.m}` : '',
          mora: vencida ? `${vencida.d}/${vencida.m}` : '',
        };
        break;
      }

      return {
      ...c,
      saldoPendiente,
      plan,
      compras: ventasCli
        .map(v => {
          const parts = v.equipo.split(' · ');
          const gPartes = v.garantiaVence ? v.garantiaVence.split('-').map(Number) : null;
          // Inferir condición desde el primer equipo vendido en la linea
          const equipoRef0 = v.lineas?.[0]?.equipoId
            ? equipos.find(e => e.id === v.lineas[0].equipoId)
            : null;
          return {
            modelo:         parts[0] || v.equipo,
            cap:            parts[1] || '',
            color:          parts[2] || '',
            imei:           v.imei || '',
            cond:           equipoRef0?.cond || null,
            bat:            null,
            usd:            v.usd,
            fecha:          v.fechaLabel,
            garantiaUrl:    v.garantiaUrl || null,
            garantiaNombre: v.garantiaNombre || null,
            garantiaVence:  v.garantiaVence || null,
            sinGarantia: v.sinGarantia || !v.garantiaVence,
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
      };
    }),
    [clientes, ventas, equipos, cobros]
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
      <main className="main-pad">
        {visited.has('resumen')  && <div style={{ display: screen === 'resumen'  ? 'block' : 'none' }}><Resumen equipos={equipos} ventas={ventas} cobros={cobros} reservas={reservas} tc={tc} onUpdateTC={updateTC} onGoCobros={() => go('cobros')} /></div>}
        {visited.has('stock')    && <div style={{ display: screen === 'stock'    ? 'block' : 'none' }}><Stock equipos={equipos} tc={tc} negocios={negocios} miNegocioId={session?.user?.app_metadata?.negocio_id || null} onAdd={addEquipo} onUpdate={updateEquipo} onDelete={deleteEquipo} /></div>}
        {visited.has('venta')    && <div style={{ display: screen === 'venta'    ? 'block' : 'none' }}><Venta equipos={equipos} clientes={clientesConCompras} tc={tc} vendedores={vendedores} negocios={negocios} miNegocioId={session?.user?.app_metadata?.negocio_id || null} onConfirm={handleConfirmVenta} onConfirmApartado={handleConfirmApartado} onAddCliente={addCliente} /></div>}
        {visited.has('cobros')   && <div style={{ display: screen === 'cobros'   ? 'block' : 'none' }}><Cobros cobros={cobros} ventas={ventas} onUpdateEstado={updateCobroEstado} onRefresh={() => db.fetchCobros().then(setCobros).catch(() => {})} /></div>}
        {visited.has('reservas') && <div style={{ display: screen === 'reservas' ? 'block' : 'none' }}><Reservas reservas={reservas} equipos={equipos} tc={tc} negocios={negocios} miNegocioId={session?.user?.app_metadata?.negocio_id || null} onConvert={convertReserva} onCancelReserva={handleCancelReserva} onDeleteReserva={handleDeleteReserva} /></div>}
        {visited.has('clientes') && <div style={{ display: screen === 'clientes' ? 'block' : 'none' }}><Clientes clientes={clientesConCompras} reservas={reservas} onAddReclamo={addReclamo} onUpdateReclamo={updateReclamo} onEditCliente={editCliente} onDeleteCliente={deleteCliente} /></div>}
        {visited.has('ventas')   && <div style={{ display: screen === 'ventas'   ? 'block' : 'none' }}><Ventas ventas={ventas} tc={tc} vendedores={vendedores} onSaveVendedor={handleSaveVendedor} onUpdateVenta={updateVenta} onDeleteVenta={handleDeleteVenta} onError={showToast} /></div>}
        {visited.has('ganancias') && <div style={{ display: screen === 'ganancias' ? 'block' : 'none' }}><Ganancias ventas={ventas} comisiones={comisiones} negocios={negocios} miNegocioId={session?.user?.app_metadata?.negocio_id || null} movimientos={movimientos} onSetPagado={handleSetPagado} onSaldarTodo={handleSaldarTodo} onCrearMovimiento={handleCrearMovimiento} onBorrarMovimiento={handleBorrarMovimiento} /></div>}
      </main>
      <Toast msg={toast} />
    </div>
  );
}
