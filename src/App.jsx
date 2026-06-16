import { useState, useRef } from 'react';
import Header from './components/Header.jsx';
import Toast from './components/Toast.jsx';
import Resumen from './screens/Resumen.jsx';
import Stock from './screens/Stock.jsx';
import Venta from './screens/Venta.jsx';
import Cobros from './screens/Cobros.jsx';
import Reservas from './screens/Reservas.jsx';
import Clientes from './screens/Clientes.jsx';

export default function App() {
  const [screen, setScreen] = useState('resumen');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const go = (s) => setScreen(s);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3400);
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
        {screen === 'resumen'  && <Resumen onGoCobros={() => go('cobros')} />}
        {screen === 'stock'    && <Stock />}
        {screen === 'venta'    && <Venta onConfirm={handleConfirmVenta} />}
        {screen === 'cobros'   && <Cobros />}
        {screen === 'reservas' && <Reservas />}
        {screen === 'clientes' && <Clientes />}
      </main>

      <Toast msg={toast} />
    </div>
  );
}
