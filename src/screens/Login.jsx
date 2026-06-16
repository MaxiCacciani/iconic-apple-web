import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

const MONO = (size, color = '#828a94') => ({ fontFamily: "'JetBrains Mono', monospace", fontSize: size, color });

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onLogin(data.session);
    }
  };

  const canSubmit = email.trim() && password && !loading;

  const field = {
    width: '100%', padding: '13px 16px', borderRadius: 11,
    background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.09)',
    color: '#eef2f7', fontSize: 14, boxSizing: 'border-box',
    outline: 'none', fontFamily: "'Hanken Grotesk', sans-serif",
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(120% 80% at 80% -12%, #1d232a 0%, #121417 54%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Hanken Grotesk', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 380, padding: '40px 36px',
        borderRadius: 24, border: '1px solid rgba(231,238,246,0.08)',
        background: 'rgba(24,27,32,0.9)',
      }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, color: '#eef2f7', marginBottom: 6 }}>
            Iconic{' '}
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: '#9ec6ec' }}>Apple</span>
          </div>
          <div style={{ ...MONO(10, '#6a717b'), letterSpacing: 2, textTransform: 'uppercase' }}>Panel de gestión</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ ...MONO(10, '#6a717b'), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Email</div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              style={field}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ ...MONO(10, '#6a717b'), letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Contraseña</div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={field}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(217,138,118,0.1)', border: '1px solid rgba(217,138,118,0.3)', fontSize: 13, color: '#e6ab98' }}>
              {error === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '13px', borderRadius: 13,
              border: '1px solid rgba(255,255,255,0.2)',
              background: canSubmit ? 'linear-gradient(160deg, #eef2f6, #b7c3ce)' : 'rgba(231,238,246,0.05)',
              color: canSubmit ? '#14171c' : '#6a717b',
              fontSize: 15, fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'default',
            }}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
