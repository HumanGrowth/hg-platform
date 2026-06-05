// ============================================================
// Human Growth — Dashboard app frame
// Owns level/range/theme state, computes data, renders the app
// chrome (sidebar + control bar) and hands data to a render-prop body.
// ============================================================

const DASH_NAV = [
  { id: 'home',   label: 'Home' },
  { id: 'paths',  label: 'Paths' },
  { id: 'lib',    label: 'Library' },
  { id: 'mentor', label: 'Mentorships' },
  { id: 'events', label: 'Events' },
  { id: 'badges', label: 'Badges' },
  { id: 'analytics', label: 'Analytics' },
];

function DashSidebar({ level }) {
  return (
    <aside style={{
      width: 232, flexShrink: 0, background: 'var(--bg-raised)',
      borderRight: '1px solid var(--border)', padding: '22px 16px',
      display: 'flex', flexDirection: 'column', gap: 22,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px' }}>
        <RingMark size={30} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase',
          letterSpacing: '0.02em', color: 'var(--fg)', lineHeight: 1 }}>Human Growth</span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {DASH_NAV.map((it) => {
          const active = it.id === 'analytics';
          return (
            <div key={it.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px',
              borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
              color: active ? 'var(--fg)' : 'var(--fg-muted)',
              background: active ? 'var(--bg-sunken)' : 'transparent',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 2,
                background: active ? 'var(--orange-500)' : 'var(--fg-subtle)',
                opacity: active ? 1 : 0.5 }} />
              <span>{it.label}</span>
            </div>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px',
        borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9999, background: 'var(--orange-200)',
          color: 'var(--warm-900)', fontWeight: 700, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 13, fontFamily: 'var(--font-body)' }}>PN</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Priya N.</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
            {level === 'team' ? 'Team lead · Design' : 'Senior Designer'}</div>
        </div>
      </div>
    </aside>
  );
}

function DashFrame({ title, subtitle, children, initialTheme = 'light', density = 'roomy' }) {
  const [level, setLevel] = React.useState('me');
  const [range, setRange] = React.useState('q');
  const [theme, setTheme] = React.useState(initialTheme);
  const data = window.DashData.getData(level, range);
  const pad = density === 'dense' ? '28px 34px 40px' : '34px 44px 48px';

  return (
    <div data-theme={theme === 'dark' ? 'dark' : undefined}
      style={{ display: 'flex', width: '100%', height: '100%', background: 'var(--bg)',
        color: 'var(--fg)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
      <DashSidebar level={level} />
      <main style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: pad, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <ControlBar level={level} setLevel={setLevel} range={range} setRange={setRange}
            theme={theme} setTheme={setTheme} members={data.members} />
          {children({ data, level, range, theme })}
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { DashFrame, DashSidebar });
