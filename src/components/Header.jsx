const S = {
  header: {
    position: 'sticky', top: 0, zIndex: 40,
    display: 'flex', alignItems: 'center', gap: 26, padding: '16px 32px',
    borderBottom: '1px solid rgba(231,238,246,0.08)',
    background: 'rgba(18,20,23,0.82)', backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 13, flexShrink: 0 },
  logoIcon: {
    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
    background: 'linear-gradient(150deg, #e9eef3 0%, #aab6c2 52%, #cdd6de 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), 0 4px 14px -6px rgba(150,180,210,0.5)',
  },
  logoIridescent: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(120deg, transparent 30%, rgba(116,168,214,0.45) 46%, rgba(168,140,214,0.4) 54%, transparent 70%)',
  },
  logoI: { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: '#16181c', position: 'relative' },
  brandCol: { display: 'flex', flexDirection: 'column', lineHeight: 1 },
  brandName: { fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 23, color: '#eef2f7', letterSpacing: 0.2 },
  brandSub: { fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: 2.2, color: '#828a94', textTransform: 'uppercase', marginTop: 3 },
  searchWrap: { flex: 1, display: 'flex', justifyContent: 'center' },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: 11, width: 380, maxWidth: '100%',
    padding: '9px 15px', borderRadius: 12,
    background: 'rgba(231,238,246,0.04)', border: '1px solid rgba(231,238,246,0.07)',
  },
  searchIcon: { width: 13, height: 13, border: '1.5px solid #6a717b', borderRadius: '50%', position: 'relative', flexShrink: 0 },
  searchIconLine: {
    position: 'absolute', width: 5, height: 1.5,
    background: '#6a717b', transform: 'rotate(45deg)', bottom: -2, right: -3,
  },
  searchPlaceholder: { flex: 1, color: '#6a717b', fontSize: 13.5 },
  kbdHint: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#828a94',
    border: '1px solid rgba(231,238,246,0.12)', borderRadius: 5, padding: '2px 6px',
  },
  nav: { display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },
  navBtnActive: { background: 'none', border: 'none', cursor: 'pointer', padding: '7px 13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 },
  navLabelActive: { fontSize: 14, fontWeight: 600, color: '#eef2f7' },
  navLabelInactive: { fontSize: 14, fontWeight: 500, color: '#828a94' },
  navDotActive: { width: 5, height: 5, borderRadius: '50%', background: '#74a8d6' },
  navDotInactive: { width: 5, height: 5, borderRadius: '50%', background: 'transparent' },
  ctaBtn: {
    marginLeft: 14, display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 17px', borderRadius: 11,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'linear-gradient(160deg, #eef2f6, #b7c3ce)',
    color: '#14171c', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 6px 18px -8px rgba(180,200,220,0.6)',
  },
};

const NAV_ITEMS = [
  { key: 'resumen',  label: 'Resumen'   },
  { key: 'stock',    label: 'Stock'     },
  { key: 'cobros',   label: 'Agenda'    },
  { key: 'reservas', label: 'Reservas'  },
  { key: 'clientes', label: 'Clientes'  },
];

export default function Header({ screen, onNav }) {
  return (
    <header style={S.header}>
      <div style={S.logoWrap}>
        <div style={S.logoIcon}>
          <div style={S.logoIridescent} />
          <span style={S.logoI}>i</span>
        </div>
        <div style={S.brandCol}>
          <span style={S.brandName}>Iconic</span>
          <span style={S.brandSub}>Villa Carlos Paz</span>
        </div>
      </div>

      <div style={S.searchWrap}>
        <div style={S.searchBox}>
          <div style={S.searchIcon}><div style={S.searchIconLine} /></div>
          <span style={S.searchPlaceholder}>Buscar equipo, cliente o IMEI…</span>
          <span style={S.kbdHint}>⌘K</span>
        </div>
      </div>

      <nav style={S.nav}>
        {NAV_ITEMS.map(({ key, label }) => {
          const active = screen === key;
          return (
            <button key={key} onClick={() => onNav(key)} style={S.navBtnActive}>
              <span style={active ? S.navLabelActive : S.navLabelInactive}>{label}</span>
              <span style={active ? S.navDotActive : S.navDotInactive} />
            </button>
          );
        })}
        <button onClick={() => onNav('venta')} style={S.ctaBtn}>
          <span style={{ fontSize: 17, lineHeight: 0, marginTop: -2 }}>+</span> Registrar venta
        </button>
      </nav>
    </header>
  );
}
