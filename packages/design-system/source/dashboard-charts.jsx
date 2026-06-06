// ============================================================
// Human Growth — Dashboard chart primitives
// SVG-based, theme-aware (CSS vars), with hover tooltips.
// Exports: Sparkline, AreaChart, RadarChart, DonutRing, BarChart,
//          GaugeRing, useMeasure
// ============================================================

const { useRef, useState, useEffect, useLayoutEffect, useCallback } = React;

// Measure a container's pixel width so SVGs can map data→pixels for tooltips.
function useMeasure() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0].contentRect.width;
      setW(cw);
    });
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Floating tooltip card — warm-inverse surface so it flips per theme.
function Tip({ x, y, children, anchor = 'center' }) {
  const tx = anchor === 'center' ? '-50%' : anchor === 'right' ? '-100%' : '0';
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: `translate(${tx}, -120%)`,
      background: 'var(--bg-inverse)', color: 'var(--fg-inverse)',
      padding: '8px 11px', borderRadius: 8, pointerEvents: 'none',
      boxShadow: 'var(--shadow-lg)', zIndex: 20, whiteSpace: 'nowrap',
      fontFamily: 'var(--font-body)',
    }}>{children}</div>
  );
}

const tipLabel = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 };
const tipValue = { fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1, marginTop: 3, letterSpacing: '-0.01em' };

// Build a smooth-ish path (Catmull-Rom → bezier) through points.
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

// ── Sparkline ────────────────────────────────────────────────
function Sparkline({ data, color = 'var(--orange-500)', w = 96, h = 32, fill = true }) {
  const min = Math.min(...data), max = Math.max(...data);
  const pad = 3, span = (max - min) || 1;
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (w - pad * 2),
    h - pad - ((v - min) / span) * (h - pad * 2),
  ]);
  const d = smoothPath(pts);
  const gid = 'sg-' + Math.random().toString(36).slice(2, 8);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L ${pts[pts.length - 1][0]},${h} L ${pts[0][0]},${h} Z`} fill={`url(#${gid})`} />
        </>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} />
    </svg>
  );
}

// ── AreaChart (trend) with hover guide + tooltip ─────────────
function AreaChart({ series, axis = [], bands = null, height = 240, color = 'var(--orange-500)',
                     unit = '', label = 'Value', compare = null, compareLabel = '' }) {
  const [ref, w] = useMeasure();
  const [hover, setHover] = useState(null);
  const padL = 38, padR = 14, padT = 16, padB = 26;
  const innerW = Math.max(10, w - padL - padR);
  const innerH = height - padT - padB;

  const all = compare ? series.concat(compare) : series;
  let lo = Math.min(...all), hi = Math.max(...all);
  // pad the domain and snap to nice-ish bounds
  lo = Math.max(0, Math.floor((lo - 5) / 10) * 10);
  hi = Math.min(100, Math.ceil((hi + 5) / 10) * 10);
  const span = (hi - lo) || 1;

  const xAt = (i) => padL + (i / (series.length - 1)) * innerW;
  const yAt = (v) => padT + innerH - ((v - lo) / span) * innerH;
  const pts = series.map((v, i) => [xAt(i), yAt(v)]);
  const cmpPts = compare ? compare.map((v, i) => [xAt(i), yAt(v)]) : null;
  const d = smoothPath(pts);
  const area = `${d} L ${pts[pts.length - 1][0]},${padT + innerH} L ${pts[0][0]},${padT + innerH} Z`;
  const gid = 'ag-' + (label || '').replace(/\W/g, '');

  const gridVals = [lo, lo + span / 2, hi];

  const onMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const i = Math.max(0, Math.min(series.length - 1, Math.round(((x - padL) / innerW) * (series.length - 1))));
    setHover(i);
  }, [series.length, innerW]);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {w > 0 && (
        <svg width={w} height={height} style={{ display: 'block' }}
             onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {/* month bands */}
          {bands && bands.map((b, i) => i % 2 === 1 && (
            <rect key={i} x={xAt(b.from)} y={padT} width={xAt(Math.min(b.to, series.length - 1)) - xAt(b.from)}
                  height={innerH} fill="var(--fg)" opacity="0.025" />
          ))}
          {/* gridlines + y labels */}
          {gridVals.map((v, i) => (
            <g key={i}>
              <line x1={padL} y1={yAt(v)} x2={w - padR} y2={yAt(v)} stroke="var(--border)" strokeWidth="1" />
              <text x={padL - 8} y={yAt(v) + 4} textAnchor="end" fontSize="11" fill="var(--fg-subtle)"
                    fontFamily="var(--font-body)">{Math.round(v)}</text>
            </g>
          ))}
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gid})`} />
          {/* compare line (dashed, muted) */}
          {cmpPts && <path d={smoothPath(cmpPts)} fill="none" stroke="var(--fg-subtle)" strokeWidth="1.6"
                           strokeDasharray="4 4" opacity="0.8" />}
          <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* x labels */}
          {axis.map((t, i) => t && (
            <text key={i} x={xAt(i)} y={height - 7} textAnchor="middle" fontSize="11" fill="var(--fg-subtle)"
                  fontFamily="var(--font-body)">{t}</text>
          ))}

          {/* hover guide */}
          {hover != null && (
            <g>
              <line x1={xAt(hover)} y1={padT} x2={xAt(hover)} y2={padT + innerH} stroke="var(--fg-muted)"
                    strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
              {cmpPts && <circle cx={cmpPts[hover][0]} cy={cmpPts[hover][1]} r="3.5" fill="var(--bg-raised)"
                                 stroke="var(--fg-subtle)" strokeWidth="2" />}
              <circle cx={pts[hover][0]} cy={pts[hover][1]} r="4.5" fill="var(--bg-raised)" stroke={color} strokeWidth="2.5" />
            </g>
          )}
        </svg>
      )}
      {hover != null && (
        <Tip x={xAt(hover)} y={yAt(series[hover]) }
             anchor={hover > series.length * 0.7 ? 'right' : hover < series.length * 0.3 ? 'left' : 'center'}>
          <div style={tipLabel}>{label}</div>
          <div style={tipValue}>{series[hover]}{unit}</div>
          {compare && <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>{compareLabel}: {compare[hover]}{unit}</div>}
        </Tip>
      )}
    </div>
  );
}

// ── RadarChart (pentagon, up to 2 datasets) ──────────────────
function RadarChart({ axes, datasets, size = 300, max = 100 }) {
  const [hover, setHover] = useState(null); // {axisIdx, dsIdx}
  const cx = size / 2, cy = size / 2 + 6;
  const R = size / 2 - 46;
  const N = axes.length;
  const angle = (i) => -Math.PI / 2 + (i / N) * Math.PI * 2;
  const pt = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];
  const rings = [0.25, 0.5, 0.75, 1];

  const polyPts = (vals) => vals.map((v, i) => pt(i, (v / max) * R));

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
        {/* rings */}
        {rings.map((rr, ri) => (
          <polygon key={ri}
            points={axes.map((_, i) => pt(i, rr * R).join(',')).join(' ')}
            fill={ri === rings.length - 1 ? 'var(--fg)' : 'none'}
            fillOpacity={ri === rings.length - 1 ? 0.015 : 0}
            stroke="var(--border)" strokeWidth="1" />
        ))}
        {/* spokes */}
        {axes.map((_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth="1" />;
        })}
        {/* datasets */}
        {datasets.map((ds, di) => {
          const p = polyPts(ds.values);
          return (
            <g key={di}>
              <polygon points={p.map((q) => q.join(',')).join(' ')}
                fill={ds.color} fillOpacity={ds.fill != null ? ds.fill : (di === 0 ? 0.18 : 0)}
                stroke={ds.color} strokeWidth={di === 0 ? 2.5 : 1.8}
                strokeDasharray={di === 0 ? '0' : '4 4'} strokeLinejoin="round" />
              {di === 0 && p.map((q, i) => (
                <circle key={i} cx={q[0]} cy={q[1]} r={hover && hover.axisIdx === i ? 6 : 4}
                  fill="var(--bg-raised)" stroke={ds.color} strokeWidth="2.5"
                  style={{ cursor: 'pointer', transition: 'r .12s' }}
                  onMouseEnter={() => setHover({ axisIdx: i })} onMouseLeave={() => setHover(null)} />
              ))}
            </g>
          );
        })}
        {/* axis labels */}
        {axes.map((a, i) => {
          const [x, y] = pt(i, R + 24);
          const anchor = Math.abs(x - cx) < 12 ? 'middle' : x > cx ? 'start' : 'end';
          return (
            <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle"
              fontSize="11.5" fontWeight="600" fill="var(--fg-muted)" fontFamily="var(--font-body)"
              style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {a.short || a.label}
            </text>
          );
        })}
      </svg>
      {hover && (
        <Tip x={pt(hover.axisIdx, (datasets[0].values[hover.axisIdx] / max) * R)[0]}
             y={pt(hover.axisIdx, (datasets[0].values[hover.axisIdx] / max) * R)[1]}>
          <div style={tipLabel}>{axes[hover.axisIdx].label}</div>
          <div style={tipValue}>{datasets[0].values[hover.axisIdx]}</div>
          {datasets[1] && <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>
            {datasets[1].name}: {datasets[1].values[hover.axisIdx]}</div>}
        </Tip>
      )}
    </div>
  );
}

// ── DonutRing (progress to target) ───────────────────────────
function DonutRing({ value, target = 100, max = 100, size = 120, stroke = 12,
                     color = 'var(--orange-500)', label = '', sub = '' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, value / max));
  const tFrac = Math.max(0, Math.min(1, target / max));
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth={stroke} />
        {/* target tick */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fg-subtle)" strokeWidth={stroke}
          strokeDasharray={`1.5 ${c}`} strokeDashoffset={-(tFrac * c) + 0.75} opacity="0.9" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${frac * c} ${c}`}
          style={{ transition: 'stroke-dasharray .6s var(--ease-out)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.26, lineHeight: 1, color: 'var(--fg)' }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── BarChart (single or grouped) with hover ──────────────────
function BarChart({ data, height = 220, color = 'var(--orange-500)', max = 100,
                    unit = '', showTarget = false }) {
  // data: [{ label, value, sub?, color?, target? }]
  const [ref, w] = useMeasure();
  const [hover, setHover] = useState(null);
  const padL = 6, padR = 6, padT = 14, padB = 34;
  const innerW = Math.max(10, w - padL - padR);
  const innerH = height - padT - padB;
  const n = data.length;
  const gap = 14;
  const bw = Math.max(8, (innerW - gap * (n - 1)) / n);
  const yAt = (v) => padT + innerH - (v / max) * innerH;

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {w > 0 && (
        <svg width={w} height={height} style={{ display: 'block' }}>
          {[0, max / 2, max].map((v, i) => (
            <line key={i} x1={padL} y1={yAt(v)} x2={w - padR} y2={yAt(v)} stroke="var(--border)" strokeWidth="1" />
          ))}
          {data.map((d, i) => {
            const x = padL + i * (bw + gap);
            const bh = (d.value / max) * innerH;
            const fill = d.color || color;
            const active = hover === i;
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                 style={{ cursor: 'pointer' }}>
                <rect x={x} y={padT} width={bw} height={innerH} fill="var(--fg)" opacity={active ? 0.04 : 0} />
                <rect x={x} y={yAt(d.value)} width={bw} height={bh} rx="3" fill={fill}
                  opacity={active ? 1 : 0.88} style={{ transition: 'opacity .12s' }} />
                {showTarget && d.target != null && (
                  <line x1={x - 1} y1={yAt(d.target)} x2={x + bw + 1} y2={yAt(d.target)}
                    stroke="var(--fg)" strokeWidth="2" strokeDasharray="3 2" opacity="0.55" />
                )}
                <text x={x + bw / 2} y={height - 18} textAnchor="middle" fontSize="11" fontWeight="600"
                  fill="var(--fg-muted)" fontFamily="var(--font-body)">{d.label}</text>
                {d.sub && <text x={x + bw / 2} y={height - 5} textAnchor="middle" fontSize="10"
                  fill="var(--fg-subtle)" fontFamily="var(--font-body)">{d.sub}</text>}
              </g>
            );
          })}
        </svg>
      )}
      {hover != null && (
        <Tip x={padL + hover * (bw + gap) + bw / 2} y={yAt(data[hover].value)}>
          <div style={tipLabel}>{data[hover].full || data[hover].label}</div>
          <div style={tipValue}>{data[hover].value}{unit}</div>
          {showTarget && data[hover].target != null &&
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>Target: {data[hover].target}{unit}</div>}
        </Tip>
      )}
    </div>
  );
}

Object.assign(window, { Sparkline, AreaChart, RadarChart, DonutRing, BarChart, useMeasure, Tip });
