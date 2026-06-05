// Top app header — search + notif + breadcrumb
function AppHeader() {
  return (
    <header style={{
      height: 64, borderBottom: '1px solid var(--border)',
      background: 'var(--cream-100)', display: 'flex', alignItems: 'center',
      padding: '0 32px', gap: 24, position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
        <span style={{ color: 'var(--fg-muted)' }}>Home</span>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{
          maxWidth: 480, margin: '0 auto',
          background: 'var(--cream-50)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '8px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ color: 'var(--fg-muted)', fontSize: 14 }}>⌕</span>
          <input placeholder="Search paths, lessons, mentors…" style={{
            flex: 1, border: 0, background: 'transparent', outline: 'none',
            fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--fg)',
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            background: 'var(--cream-200)', padding: '2px 6px', borderRadius: 4,
            color: 'var(--fg-muted)',
          }}>⌘ K</span>
        </div>
      </div>

      <button style={{
        background: 'transparent', border: '1px solid var(--border-strong)',
        padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13,
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        color: 'var(--warm-900)',
      }}>+ New brief</button>

      <button style={{
        width: 36, height: 36, borderRadius: 8, background: 'transparent',
        border: '1px solid var(--border)', cursor: 'pointer', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 16 }}>◔</span>
        <span style={{
          position: 'absolute', top: 6, right: 6, width: 8, height: 8,
          background: 'var(--orange-500)', borderRadius: 9999, border: '2px solid var(--cream-100)',
        }}></span>
      </button>
    </header>
  );
}

window.AppHeader = AppHeader;
