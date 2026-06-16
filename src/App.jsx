import { useState, useRef } from 'react';
import Header from './components/Header.jsx';
import Toast from './components/Toast.jsx';
import Resumen from './screens/Resumen.jsx';
import Stock from './screens/Stock.jsx';
import Venta from './screens/Venta.jsx';
import Cobros from './screens/Cobros.jsx';
import Reservas from './screens/Reservas.jsx';
import Clientes from './screens/Clientes.jsx';
import { EQUIPOS_INIT, CLIENTES_INIT, nextId } from './data/data.js';

export default function App() {
  const [screen, setScreen] = useState('resumen');
  const [toast, setToast] = useState(null);
  const [equipos, setEquipos] = useState(EQUIPOS_INIT);
  const [clientes, setClientes] = useState(CLIENTES_INIT);
  const toastTimer = useRef(null);

  const go = (s) => setScreen(s);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3400);
  };

  const addEquipo = (item) => {
    const newItem = { ...item, id: nextId(equipos) };
    setEquipos(prev => [...prev, newItem]);
    showToast('Producto agregado al stock');
  };

  const updateEquipo = (updated) => {
    setEquipos(prev => prev.map(e => e.id === updated.id ? updated : e));
    showToast('Producto actualizado');
  };

  const addReclamo = (clienteId, reclamo) => {
    setClientes(prev => prev.map(c =>
      c.id === clienteId
        ? { ...c, reclamos: [...(c.reclamos || []), reclamo] }
        : c
    ));
    showToast('Reclamo registrado');
  };

  const handleConfirmVenta = () => {
    showToast('Venta registrada con éxito');
    setTimeout(() => go('resumen'), 300);
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
        {screen === 'venta'    && <Venta equipos={equipos} clientes={clientes} onConfirm={handleConfirmVenta} />}
        {screen === 'cobros'   && <Cobros clientes={clientes} />}
        {screen === 'reservas' && <Reservas />}
        {screen === 'clientes' && <Clientes clientes={clientes} onAddReclamo={addReclamo} />}
      </main>

      <Toast msg={toast} />
    </div>
  );
}
