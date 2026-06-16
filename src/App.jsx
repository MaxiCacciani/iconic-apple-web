import { useState, useRef } from 'react';
import Header from './components/Header.jsx';
import Toast from './components/Toast.jsx';
import Resumen from './screens/Resumen.jsx';
import Stock from './screens/Stock.jsx';
import Venta from './screens/Venta.jsx';
import Cobros from './screens/Cobros.jsx';
import Reservas from './screens/Reservas.jsx';
import Clientes from './screens/Clientes.jsx';
import Ventas from './screens/Ventas.jsx';
import { EQUIPOS_INIT, CLIENTES_INIT, RESERVAS_INIT, VENTAS_INIT, nextId, TODAY } from './data/data.js';

export default function App() {
  const [screen, setScreen] = useState('resumen');
  const [toast, setToast] = useState(null);
  const [equipos, setEquipos] = useState(EQUIPOS_INIT);
  const [clientes, setClientes] = useState(CLIENTES_INIT);
  const [reservas, setReservas] = useState(RESERVAS_INIT);
  const [ventas, setVentas] = useState(VENTAS_INIT);
  const toastTimer = useRef(null);

  const go = (s) => setScreen(s);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3400);
  };

  const MONTH_ABBR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const todayLabel = `${TODAY.d} ${MONTH_ABBR[TODAY.m - 1]} ${TODAY.y}`;
  const todayNum = TODAY.y * 10000 + TODAY.m * 100 + TODAY.d;

  const addEquipo = (item) => {
    setEquipos(prev => [...prev, { ...item, id: nextId(prev) }]);
    showToast('Producto agregado al stock');
  };

  const updateEquipo = (updated) => {
    setEquipos(prev => prev.map(e => e.id === updated.id ? updated : e));
    showToast('Producto actualizado');
  };

  const addCliente = (data) => {
    const nuevo = {
      id: 'c_' + Date.now(),
      inicial: data.nombre.trim()[0].toUpperCase(),
      compras: [], plan: null, reclamos: [],
      ...data,
    };
    setClientes(prev => [...prev, nuevo]);
    return nuevo;
  };

  const addReclamo = (clienteId, reclamo) => {
    setClientes(prev => prev.map(c =>
      c.id === clienteId ? { ...c, reclamos: [...(c.reclamos || []), reclamo] } : c
    ));
    showToast('Reclamo registrado');
  };

  const updateReclamo = (clienteId, reclamoId, updates) => {
    setClientes(prev => prev.map(c =>
      c.id === clienteId
        ? { ...c, reclamos: c.reclamos.map(r => r.id === reclamoId ? { ...r, ...updates } : r) }
        : c
    ));
    showToast('Reclamo actualizado');
  };

  const registrarVenta = (ventaData) => {
    const newVenta = {
      id: 'new_' + Date.now(),
      fechaLabel: todayLabel,
      fechaNum: todayNum,
      ...ventaData,
    };
    setVentas(prev => [newVenta, ...prev]);
    return newVenta;
  };

  const handleConfirmVenta = (ventaData) => {
    registrarVenta(ventaData);
    showToast('Venta registrada con éxito');
    setTimeout(() => go('ventas'), 300);
  };

  const convertReserva = (reservaId, ventaData) => {
    setReservas(prev => prev.map(r => r.id === reservaId ? { ...r, estado: 'convertida' } : r));
    registrarVenta(ventaData);
    showToast('Reserva convertida en venta');
    setTimeout(() => go('ventas'), 400);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(120% 80% at 80% -12%, #1d232a 0%, #121417 54%)',
      color: '#eef2f7',
      fontFamily: "'Hanken Grotesk', sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Header screen={screen} onNav={go} />

      <main style={{ flex: 1, width: '100%', maxWidth: 1320, margin: '0 auto', padding: '38px 32px 80px' }}>
        {screen === 'resumen'  && <Resumen equipos={equipos} onGoCobros={() => go('cobros')} />}
        {screen === 'stock'    && <Stock equipos={equipos} onAdd={addEquipo} onUpdate={updateEquipo} />}
        {screen === 'venta'    && <Venta equipos={equipos} clientes={clientes} onConfirm={handleConfirmVenta} onAddCliente={addCliente} />}
        {screen === 'cobros'   && <Cobros clientes={clientes} />}
        {screen === 'reservas' && <Reservas reservas={reservas} onConvert={convertReserva} />}
        {screen === 'clientes' && <Clientes clientes={clientes} reservas={reservas} onAddReclamo={addReclamo} onUpdateReclamo={updateReclamo} />}
        {screen === 'ventas'   && <Ventas ventas={ventas} />}
      </main>

      <Toast msg={toast} />
    </div>
  );
}
