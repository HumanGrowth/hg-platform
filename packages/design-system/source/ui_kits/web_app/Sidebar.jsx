// Sidebar — left nav rail
function Sidebar({ active = 'home' }) {
  const items = [
    { id: 'home',  label: 'Home',         badge: null },
    { id: 'paths', label: 'Paths',        badge: '12' },
    { id: 'lib',   label: 'Library',      badge: null },
    { id: 'mentor', label: 'Mentorships', badge: '·' },
    { id: 'events', label: 'Events',      badge: 'Live' },
    { id: 'badges', label: 'Badges',      badge: null },
  ];

  const itemS = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', borderRadius: 8,
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
    color: isActive ? 'var(--warm-900)' : 'var(--fg-muted)',
    background: isActive ? 'var(--cream-200)' : 'transparent',
  });

  return (
    <aside style={{
      position: 'fixed', top: 0, bottom: 0, left: 0, width: 248,
      background: 'var(--cream-50)', borderRight: '1px solid var(--border)',
      padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      {/* Workspace switcher */}
      <button style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
        background: 'var(--cream-100)', border: '1px solid var(--border)',
        borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left',
      }}>
        <div style={{
          width: 32, height: 32, background: 'var(--orange-500)', borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 14,
        }}>L</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Linear</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Team workspace</div>
        </div>
        <span style={{ color: 'var(--fg-muted)' }}>⌄</span>
      </button>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(it => (
          <div key={it.id} style={itemS(active === it.id)}>
            <span style={{ width: 16, height: 16, display: 'inline-block', background: active === it.id ? 'var(--orange-500)' : 'var(--warm-400)', borderRadius: 3, opacity: active === it.id ? 1 : 0.4 }}></span>
            <span style={{ flex: 1 }}>{it.label}</span>
            {it.badge && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                background: it.badge === 'Live' ? 'var(--orange-500)' : 'var(--cream-300)',
                color: it.badge === 'Live' ? '#fff' : 'var(--warm-700)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>{it.badge}</span>
            )}
          </div>
        ))}
      </nav>

      <div style={{ height: 1, background: 'var(--border)' }}></div>

      {/* Streak card */}
      <div style={{
        background: 'var(--warm-900)', color: 'var(--cream-100)',
        borderRadius: 8, padding: 14,
      }}>
        <div className="eyebrow" style={{ color: 'var(--orange-300)' }}>STREAK</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: 1, marginTop: 6 }}>
          12 <span style={{ fontSize: 18, opacity: 0.6 }}>days</span>
        </div>
        <div style={{ fontSize: 12, color: '#B8A799', marginTop: 4 }}>2 more for a milestone</div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9999, background: 'var(--orange-200)',
          color: 'var(--warm-900)', fontWeight: 700, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 13,
        }}>PN</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Priya N.</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>priya@linear.app</div>
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
