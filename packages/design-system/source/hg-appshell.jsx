// ============================================================
// Human Growth — App shell (collapsible sidebar + topbar + router)
// ============================================================

const APP_NAV = [
{ id: 'catalog', label: 'Catálogo', icon: 'grid' },
{ id: 'assessment', label: 'Diagnóstico', icon: 'clipboard' },
{ id: 'profile', label: 'Mi perfil', icon: 'user' },
{ id: 'leader', label: 'Vista del líder', icon: 'chart' }];


const NOTIFS = [
{ who: 'Tomás Becker', txt: 'completó “Evita el burnout operativo”.', t: 'hace 1 h', dim: 'salud' },
{ who: 'Tu equipo', txt: 'subió +4 pts en Relaciones esta semana.', t: 'hace 5 h', dim: 'relaciones' },
{ who: 'Lucía Moreno', txt: 'lleva 6 días sin actividad.', t: 'ayer', dim: 'paz', warn: true }];


function NotifButton() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: 38, height: 38, borderRadius: 9,
        border: '1px solid var(--border)', background: 'var(--bg-raised)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        color: 'var(--fg-muted)' }}>
        <Icon name="bell" size={19} />
        <span style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7,
          background: 'var(--orange-500)', borderRadius: 999, border: '2px solid var(--bg-raised)' }} />
      </button>
      {open &&
      <div style={{ position: 'absolute', top: '110%', right: 0, width: 320, background: 'var(--bg-raised)',
        border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', padding: 8, zIndex: 60 }}>
          <div style={{ padding: '8px 10px 10px', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: 'var(--fg-subtle)' }}>Notificaciones · managers</div>
          {NOTIFS.map((n, i) =>
        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px', borderRadius: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: hexA2(window.HG.dim(n.dim).color, 0.14) }}>
                <DimIcon dim={n.dim} size={16} color={window.HG.dim(n.dim).color} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.4, color: 'var(--fg)' }}>
                  <strong>{n.who}</strong> {n.txt}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 2 }}>{n.t}</div>
              </div>
            </div>
        )}
        </div>
      }
    </div>);

}

function AppShell({ view, setView, onExit }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const w = collapsed ? 76 : 248;
  const Screen = { catalog: window.Catalog, assessment: window.Assessment,
    profile: window.Profile, leader: window.Leader }[view] || window.Catalog;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', background: 'var(--bg)',
      color: 'var(--fg)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width: w, flexShrink: 0, background: 'var(--bg-raised)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        transition: 'width var(--dur-base) var(--ease-out)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px',
          justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <RingMark size={30} />
          {!collapsed && <span style={{ fontFamily: 'var(--font-display)', fontSize: 21,
            textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1, whiteSpace: 'nowrap' }}>Human Growth</span>}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 14px' }}>
          {APP_NAV.map((it) => {
            const active = it.id === view;
            return (
              <button key={it.id} onClick={() => setView(it.id)} title={it.label} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: collapsed ? '11px' : '11px 12px',
                borderRadius: 9, border: 'none', cursor: 'pointer', width: '100%',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: active ? 'var(--bg-sunken)' : 'transparent',
                color: active ? 'var(--fg)' : 'var(--fg-muted)', fontFamily: 'var(--font-body)',
                fontSize: 14.5, fontWeight: 600, transition: 'background .12s' }}>
                <Icon name={it.icon} size={20} color={active ? 'var(--orange-600)' : 'currentColor'} />
                {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{it.label}</span>}
              </button>);

          })}
        </nav>

        <div style={{ marginTop: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!collapsed &&
          <div style={{ background: 'var(--warm-900)', color: 'var(--cream-100)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'var(--orange-300)' }}>Racha</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1, marginTop: 4 }}>
                9 <span style={{ fontSize: 15, opacity: 0.6 }}>días</span></div>
            </div>
          }
          <button onClick={() => setCollapsed((c) => !c)} title="Colapsar" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer',
            color: 'var(--fg-muted)', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <Icon name="panelLeft" size={18} />
            {!collapsed && <span style={{ fontSize: 13.5, fontWeight: 600 }}>Colapsar</span>}
          </button>
          <button onClick={onExit} title="Cerrar sesión" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8,
            border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-muted)',
            justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <Icon name="logout" size={18} />
            {!collapsed && <span style={{ fontSize: 13.5, fontWeight: 600 }}>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ height: 64, flexShrink: 0, borderBottom: '1px solid var(--border)',
          background: 'var(--bg-raised)', display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px' }}>
          <div style={{ flex: 1, maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-sunken)',
              border: '1px solid var(--border)', borderRadius: 9, padding: '9px 14px' }}>
              <Icon name="search" size={17} color="var(--fg-subtle)" />
              <input placeholder="Busca cápsulas, dimensiones, mentores…" style={{ flex: 1, border: 0,
                background: 'transparent', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 14,
                color: 'var(--fg)' }} />
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <Btn variant="soft" size="sm" icon="sparkles" onClick={() => setView('assessment')}>Mi siguiente paso</Btn>
            <NotifButton />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 6 }}>
              <Avatar initials="JA" size={36} />
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Jorge A.</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>Nivel L3 · Práctica</div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable screen */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Screen setView={setView} />
        </div>
      </main>
    </div>);

}

window.AppShell = AppShell;