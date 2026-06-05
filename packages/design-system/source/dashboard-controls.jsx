// ============================================================
// Human Growth — Dashboard shared UI (controls + atoms)
// Exports: ControlBar, Segmented, DeltaPill, LevelAvatars,
//          Eyebrow, RingMark
// ============================================================

// The faceted brand ring as an inline SVG mark (36 segments).
function RingMark({ size = 28, color = 'var(--orange-500)' }) {
  const tris = [];
  const N = 36;
  for (let i = 0; i < N; i++) {
    tris.push(<polygon key={i} points="0,-92 5,-70 -5,-70" transform={`rotate(${(360 / N) * i})`} />);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ display: 'block', color }} aria-hidden="true">
      <g fill="currentColor" transform="translate(100,100)">{tris}</g>
    </svg>
  );
}

function Eyebrow({ children, accent = false, style }) {
  return (
    <div style={{
      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.16em',
      color: accent ? 'var(--orange-700)' : 'var(--fg-subtle)', ...style,
    }}>{children}</div>
  );
}

// Delta pill: ▲ +12  /  ▼ -3
function DeltaPill({ value, suffix = '', size = 'md' }) {
  const up = value >= 0;
  const pad = size === 'sm' ? '2px 7px' : '3px 9px';
  const fs = size === 'sm' ? 11 : 12.5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: pad,
      borderRadius: 6, fontSize: fs, fontWeight: 700, fontFamily: 'var(--font-body)',
      fontVariantNumeric: 'tabular-nums',
      background: up ? 'var(--success-bg)' : 'var(--danger-bg)',
      color: up ? 'var(--success)' : 'var(--danger)',
    }}>
      <span style={{ fontSize: fs - 2 }}>{up ? '▲' : '▼'}</span>
      {up ? '+' : ''}{value}{suffix}
    </span>
  );
}

// Segmented control — used for level switch + time range.
function Segmented({ options, value, onChange, size = 'md' }) {
  const pad = size === 'sm' ? '6px 12px' : '8px 16px';
  const fs = size === 'sm' ? 13 : 14;
  return (
    <div style={{
      display: 'inline-flex', background: 'var(--bg-sunken)', borderRadius: 10,
      padding: 3, border: '1px solid var(--border)', gap: 2,
    }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            padding: pad, borderRadius: 7, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: fs, fontWeight: 600,
            background: active ? 'var(--bg-raised)' : 'transparent',
            color: active ? 'var(--fg)' : 'var(--fg-muted)',
            boxShadow: active ? 'var(--shadow-sm)' : 'none',
            transition: 'all var(--dur-fast) var(--ease-state)',
            display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
          }}>
            {o.icon && <span style={{
              width: 16, height: 16, borderRadius: o.round ? 9999 : 4,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: active ? 'var(--orange-500)' : 'var(--fg-subtle)',
              color: '#fff', fontSize: 10, fontWeight: 800,
            }}>{o.icon}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Sun/moon theme toggle button.
function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark';
  return (
    <button onClick={onToggle} title={dark ? 'Switch to light' : 'Switch to dark'} style={{
      width: 38, height: 38, borderRadius: 9, border: '1px solid var(--border)',
      background: 'var(--bg-raised)', cursor: 'pointer', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)',
      transition: 'all var(--dur-fast) var(--ease-state)',
    }}>
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
      )}
    </button>
  );
}

// Small stack of teammate avatars (team view).
function LevelAvatars({ members = [], n = 4 }) {
  const shown = members.slice(0, n);
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((m, i) => (
        <div key={i} style={{
          width: 28, height: 28, borderRadius: 9999, background: 'var(--orange-200)',
          color: 'var(--warm-900)', fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--bg-raised)', marginLeft: i ? -8 : 0,
          fontFamily: 'var(--font-body)',
        }}>{m.initials}</div>
      ))}
      {members.length > n && (
        <div style={{
          width: 28, height: 28, borderRadius: 9999, background: 'var(--bg-sunken)',
          color: 'var(--fg-muted)', fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--bg-raised)', marginLeft: -8, fontFamily: 'var(--font-body)',
        }}>+{members.length - n}</div>
      )}
    </div>
  );
}

// The top control bar: title + level switch + time range + theme.
function ControlBar({ level, setLevel, range, setRange, theme, setTheme, members }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      paddingBottom: 22, marginBottom: 26, borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
        <Segmented
          value={level} onChange={setLevel}
          options={[
            { value: 'me', label: 'Me', icon: 'P', round: true },
            { value: 'team', label: 'My team', icon: 'T' },
          ]} />
        {level === 'team' && <LevelAvatars members={members} />}
      </div>

      <Segmented size="sm" value={range} onChange={setRange}
        options={[
          { value: '6w', label: '6 weeks' },
          { value: 'q', label: 'Quarter' },
          { value: '12m', label: '12 months' },
        ]} />
      <ThemeToggle theme={theme} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
    </div>
  );
}

Object.assign(window, { RingMark, Eyebrow, DeltaPill, Segmented, ThemeToggle, LevelAvatars, ControlBar });
