// ============================================================
// Human Growth — Icon set
// Lucide-style stroke icons (1.75px, round caps) per the brand system.
// <Icon name="..." size sw color /> for UI glyphs; the six HG-6D
// dimension icons are individual components for fidelity.
// ============================================================

function Svg({ size = 24, sw = 1.75, color = 'currentColor', children, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}>{children}</svg>
  );
}

// ---- HG-6D dimension icons ----------------------------------
const DimCarrera   = (p) => <Svg {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 13h20"/></Svg>;
const DimProposito = (p) => <Svg {...p}><circle cx="12" cy="12" r="9.5"/><polygon points="16.5 7.5 14 14 7.5 16.5 10 10"/></Svg>;
const DimRelaciones= (p) => <Svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.5"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.5a4 4 0 0 1 0 7"/></Svg>;
const DimSalud     = (p) => <Svg {...p}><path d="M20.5 8.6A5 5 0 0 0 12 6.1 5 5 0 0 0 3.5 8.6c0 1.7 1 3.3 2.3 4.6"/><path d="M3.5 14h3l1.5-3 3 6 1.8-4 1.2 2h6.5"/><path d="M12 21l6-6"/></Svg>;
const DimPaz       = (p) => <Svg {...p}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5-6"/></Svg>;
const DimEstabilidad=(p) => <Svg {...p}><path d="m16 15 3-7 3 7c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 15 3-7 3 7c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h4c1.5 0 3.5-.7 5-1.5C13.5 6.3 15.5 7 17 7h4"/></Svg>;

const DIM_ICONS = {
  carrera: DimCarrera, proposito: DimProposito, relaciones: DimRelaciones,
  salud: DimSalud, paz: DimPaz, estabilidad: DimEstabilidad,
};
function DimIcon({ dim, ...p }) { const C = DIM_ICONS[dim] || DimCarrera; return <C {...p} />; }

// ---- UI glyph set -------------------------------------------
const PATHS = {
  menu:        (<><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></>),
  panelLeft:   (<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></>),
  search:      (<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>),
  bell:        (<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>),
  play:        (<><polygon points="6 4 20 12 6 20 6 4"/></>),
  playCircle:  (<><circle cx="12" cy="12" r="9.5"/><polygon points="10 8.5 16 12 10 15.5 10 8.5"/></>),
  clock:       (<><circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3.5 2"/></>),
  sparkles:    (<><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"/></>),
  chevronRight:(<><path d="m9 6 6 6-6 6"/></>),
  chevronDown: (<><path d="m6 9 6 6 6-6"/></>),
  chevronLeft: (<><path d="m15 6-6 6 6 6"/></>),
  check:       (<><path d="M20 6 9 17l-5-5"/></>),
  checkCircle: (<><circle cx="12" cy="12" r="9.5"/><path d="m8.5 12 2.5 2.5 4.5-5"/></>),
  arrowRight:  (<><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></>),
  arrowUpRight:(<><path d="M7 17 17 7"/><path d="M8 7h9v9"/></>),
  grid:        (<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>),
  clipboard:   (<><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></>),
  user:        (<><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></>),
  chart:       (<><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12.5" y="7" width="3" height="10" rx="1"/><rect x="18" y="13" width="3" height="4" rx="1"/></>),
  layers:      (<><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></>),
  target:      (<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>),
  trendingUp:  (<><path d="m3 17 6-6 4 4 8-8"/><path d="M17 7h4v4"/></>),
  trendingDown:(<><path d="m3 7 6 6 4-4 8 8"/><path d="M17 17h4v-4"/></>),
  logout:      (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></>),
  plus:        (<><path d="M12 5v14"/><path d="M5 12h14"/></>),
  star:        (<><path d="m12 3 2.9 5.9 6.1.9-4.5 4.4 1 6.1L12 17.8 6.5 20.3l1-6.1L3 9.8l6.1-.9L12 3Z"/></>),
  lock:        (<><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>),
  bolt:        (<><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></>),
  users:       (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.5"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.5a4 4 0 0 1 0 7"/></>),
  flag:        (<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1Z"/><path d="M4 22V4"/></>),
  building:    (<><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01"/></>),
  globe:       (<><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.5 2.7 2.5 16.3 0 19M12 2.5c-2.5 2.7-2.5 16.3 0 19"/></>),
  shield:      (<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>),
  x:           (<><path d="M18 6 6 18M6 6l12 12"/></>),
};
function Icon({ name, size = 20, sw = 1.75, color = 'currentColor', style }) {
  return <Svg size={size} sw={sw} color={color} style={style}>{PATHS[name] || PATHS.target}</Svg>;
}

Object.assign(window, { Icon, DimIcon, Svg });
