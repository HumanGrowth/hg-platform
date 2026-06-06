// ============================================================
// Human Growth — Shared product components
// GapBars (entry→exit ROI), Avatar, LevelChip, PillarBar, Btn
// ============================================================

function Btn({ children, onClick, variant = 'primary', size = 'md', style, icon, iconRight }) {
  const sizes = { sm: '8px 14px', md: '11px 18px', lg: '14px 24px' };
  const base = {
    border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)',
    fontWeight: 700, fontSize: size === 'lg' ? 15.5 : size === 'sm' ? 13.5 : 14.5,
    padding: sizes[size], display: 'inline-flex', alignItems: 'center', gap: 8,
    transition: 'all var(--dur-fast) var(--ease-state)', whiteSpace: 'nowrap', ...style,
  };
  const variants = {
    primary: { background: 'var(--orange-500)', color: '#fff' },
    ghost: { background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border-strong)' },
    soft: { background: 'var(--bg-sunken)', color: 'var(--fg)' },
    quiet: { background: 'transparent', color: 'var(--fg-muted)' },
  };
  const iconColor = variant === 'primary' ? '#fff' : 'currentColor';
  return (
    <button onClick={onClick} style={{ ...base, ...variants[variant] }}>
      {icon && <Icon name={icon} size={16} color={iconColor} />}
      {children}
      {iconRight && <Icon name={iconRight} size={16} color={iconColor} />}
    </button>
  );
}

function Avatar({ initials, size = 36, src, ring }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 9999, background: 'var(--orange-200)',
      color: 'var(--warm-900)', fontWeight: 700, fontSize: size * 0.36, display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-body)',
      border: ring ? '2px solid var(--bg-raised)' : 'none', overflow: 'hidden' }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  );
}

function LevelChip({ code, name, color = 'var(--orange-500)', size = 'md' }) {
  const sm = size === 'sm';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: sm ? '3px 9px' : '5px 12px', borderRadius: 999,
      background: hexA2(color, 0.12), color }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: sm ? 13 : 15, letterSpacing: '0.02em' }}>{code}</span>
      {name && <span style={{ fontSize: sm ? 11.5 : 12.5, fontWeight: 700, color: 'var(--fg)' }}>{name}</span>}
    </span>
  );
}

function PillarBar({ value, target, color, height = 8 }) {
  const v = Math.max(0, Math.min(100, value));
  const t = target != null ? Math.max(0, Math.min(100, target)) : null;
  return (
    <div style={{ position: 'relative', height, background: 'var(--bg-sunken)', borderRadius: 999 }}>
      <div style={{ position: 'absolute', inset: 0, width: `${v}%`, background: color, borderRadius: 999,
        transition: 'width .6s var(--ease-out)' }} />
      {t != null && <div title={`Meta ${t}`} style={{ position: 'absolute', top: -2, bottom: -2,
        left: `${t}%`, width: 2, background: 'var(--fg)', opacity: 0.45, borderRadius: 2 }} />}
    </div>
  );
}

// Entry → exit gap, the ROI asset. data: { key: {entry, exit} }, dims: [{key,label,color}]
function GapBars({ data, dims, compact = false }) {
  const rowGap = compact ? 14 : 20;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: rowGap }}>
      {dims.map((d) => {
        const g = data[d.key];
        const delta = g.exit - g.entry;
        return (
          <div key={d.key} style={{ display: 'grid',
            gridTemplateColumns: compact ? '92px 1fr 52px' : '120px 1fr 64px',
            alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <DimIcon dim={d.key} size={compact ? 16 : 18} color={d.color} />
              <span style={{ fontSize: compact ? 12.5 : 13.5, fontWeight: 700, color: 'var(--fg)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.short}</span>
            </div>
            <div style={{ position: 'relative' }}>
              {/* entry (muted) */}
              <div style={{ height: 6, background: 'var(--bg-sunken)', borderRadius: 999, marginBottom: 4 }}>
                <div style={{ height: '100%', width: `${g.entry}%`, background: 'var(--warm-300)',
                  borderRadius: 999 }} />
              </div>
              {/* exit (colored) */}
              <div style={{ height: 6, background: 'var(--bg-sunken)', borderRadius: 999 }}>
                <div style={{ height: '100%', width: `${g.exit}%`, background: d.color, borderRadius: 999,
                  transition: 'width .6s var(--ease-out)' }} />
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 13,
                fontWeight: 800, color: 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>
                +{delta}</span>
            </div>
          </div>
        );
      })}
      {!compact && (
        <div style={{ display: 'flex', gap: 18, marginTop: 2, fontSize: 12, color: 'var(--fg-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 6, borderRadius: 3, background: 'var(--warm-300)' }} /> Entrada</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 6, borderRadius: 3, background: 'var(--orange-500)' }} /> Salida actual</span>
        </div>
      )}
    </div>
  );
}

function hexA2(hex, a) {
  if (!hex || hex[0] !== '#') return hex;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Legend dot — used by radar/area charts across screens.
function LegendDot({ color, dashed, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
      color: 'var(--fg-muted)', fontWeight: 600 }}>
      <span style={{ width: 14, height: 0, borderTop: dashed ? '2px dashed' : '3px solid', borderColor: color }} />
      {label}
    </span>
  );
}

// Delta pill: ▲ +12 / ▼ −3
function DeltaPill({ value, suffix = '', size = 'md' }) {
  const up = value >= 0;
  const pad = size === 'sm' ? '2px 7px' : '3px 9px';
  const fs = size === 'sm' ? 11 : 12.5;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: pad, borderRadius: 6,
      fontSize: fs, fontWeight: 700, fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums',
      background: up ? 'var(--success-bg)' : 'var(--danger-bg)', color: up ? 'var(--success)' : 'var(--danger)' }}>
      <span style={{ fontSize: fs - 2 }}>{up ? '▲' : '▼'}</span>{up ? '+' : ''}{value}{suffix}
    </span>
  );
}

Object.assign(window, { Btn, Avatar, LevelChip, PillarBar, GapBars, hexA2, LegendDot, DeltaPill });
