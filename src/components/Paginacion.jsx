import { useEffect } from 'react';

// Paginación client-side compartida: los datos ya están en memoria,
// esto acota el costo de render de listas largas.
export default function Paginacion({ total, pagina, porPagina, onCambio }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  // Si la lista se achica (borrar/vender) y la página quedó fuera de rango,
  // volver a la última página válida — sin esto la pantalla queda vacía sin escape
  useEffect(() => {
    if (pagina > paginas) onCambio(paginas);
  }, [pagina, paginas, onCambio]);
  if (paginas <= 1) return null;
  const btn = (dis) => ({
    padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(231,238,246,0.12)',
    background: 'rgba(231,238,246,0.03)', color: dis ? '#4a5058' : '#a6afba',
    fontSize: 12.5, cursor: dis ? 'default' : 'pointer', fontFamily: "'Hanken Grotesk', sans-serif",
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
      <button disabled={pagina <= 1} onClick={() => onCambio(pagina - 1)} style={btn(pagina <= 1)}>‹ Anterior</button>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#828a94' }}>
        Página {pagina} de {paginas} · {total} registros
      </span>
      <button disabled={pagina >= paginas} onClick={() => onCambio(pagina + 1)} style={btn(pagina >= paginas)}>Siguiente ›</button>
    </div>
  );
}
