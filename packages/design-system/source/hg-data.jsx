// ============================================================
// Human Growth — Product data (HG-6D)
// All copy in Spanish. Illustrative data.
// ============================================================

const DIMS = [
  { key: 'carrera',     label: 'Carrera',     short: 'Carrera', color: '#FF4500',
    desc: 'Crece en tu rol con habilidades que importan hoy y en 2030.' },
  { key: 'proposito',   label: 'Propósito',   short: 'Propósito', color: '#B8741A',
    desc: 'Conecta tu trabajo diario con un sentido más grande.' },
  { key: 'relaciones',  label: 'Relaciones',  short: 'Relaciones', color: '#C24E1A',
    desc: 'Construye confianza y colabora mejor con tu equipo.' },
  { key: 'salud',       label: 'Salud',       short: 'Salud', color: '#1F7A4D',
    desc: 'Energía y hábitos sostenibles para rendir sin quemarte.' },
  { key: 'paz',         label: 'Paz interior',short: 'Paz', color: '#2A5F7A',
    desc: 'Maneja el estrés y cultiva claridad mental.' },
  { key: 'estabilidad', label: 'Estabilidad', short: 'Estabilidad', color: '#6B5949',
    desc: 'Finanzas, rutinas y bases firmes para tu vida.' },
];

// Personal 6D: diagnóstico de entrada vs. medición actual (para el gap ROI).
const PERSONAL = {
  carrera:     { entry: 48, now: 72, target: 80 },
  proposito:   { entry: 41, now: 63, target: 75 },
  relaciones:  { entry: 55, now: 68, target: 78 },
  salud:       { entry: 38, now: 70, target: 80 },
  paz:         { entry: 44, now: 57, target: 72 },
  estabilidad: { entry: 50, now: 75, target: 82 },
};

// Niveles L1–L6
const LEVELS = [
  { id: 1, code: 'L1', name: 'Despertar' },
  { id: 2, code: 'L2', name: 'Fundamentos' },
  { id: 3, code: 'L3', name: 'Práctica' },
  { id: 4, code: 'L4', name: 'Integración' },
  { id: 5, code: 'L5', name: 'Maestría' },
  { id: 6, code: 'L6', name: 'Mentoría' },
];

// Holistic Maturity Matrix — nivel actual por dimensión (1–6)
const MATRIX = { carrera: 4, proposito: 2, relaciones: 3, salud: 4, paz: 2, estabilidad: 4 };

// Mentores IA
const AI_MENTORS = ['Aria', 'Mateo', 'Nora', 'Leo', 'Sofía', 'Iván'];

// Catálogo de micro-cursos (cápsulas <5 min)
function mkCourse(title, dim, min, level, mentor, done) {
  return { title, dim, min, level, mentor, done: !!done };
}
const CATALOG = {
  continuar: [
    mkCourse('Da feedback sin rodeos', 'relaciones', 4, 'L3', 'Nora'),
    mkCourse('Prioriza con la matriz 2×2', 'carrera', 5, 'L3', 'Mateo'),
    mkCourse('Respira para reenfocarte', 'paz', 3, 'L2', 'Aria'),
  ],
  rows: [
    { dim: 'carrera', title: 'Carrera', courses: [
      mkCourse('Escribe un brief claro', 'carrera', 4, 'L2', 'Mateo'),
      mkCourse('Prioriza con la matriz 2×2', 'carrera', 5, 'L3', 'Mateo'),
      mkCourse('Negocia tu próximo rol', 'carrera', 5, 'L4', 'Leo'),
      mkCourse('Aprende a delegar', 'carrera', 4, 'L4', 'Nora'),
      mkCourse('Tu mapa de habilidades 2030', 'carrera', 5, 'L3', 'Sofía'),
    ]},
    { dim: 'salud', title: 'Salud y energía', courses: [
      mkCourse('Diseña tu mañana en 5 pasos', 'salud', 4, 'L1', 'Aria'),
      mkCourse('Pausas activas en la oficina', 'salud', 3, 'L1', 'Iván'),
      mkCourse('Sueño: la palanca oculta', 'salud', 5, 'L2', 'Aria'),
      mkCourse('Come para sostener energía', 'salud', 4, 'L2', 'Sofía'),
      mkCourse('Evita el burnout operativo', 'salud', 5, 'L3', 'Nora'),
    ]},
    { dim: 'paz', title: 'Paz interior', courses: [
      mkCourse('Respira para reenfocarte', 'paz', 3, 'L2', 'Aria'),
      mkCourse('Nombra lo que sientes', 'paz', 4, 'L2', 'Leo'),
      mkCourse('Desactiva la rumiación', 'paz', 5, 'L3', 'Aria'),
      mkCourse('Cierra el día con calma', 'paz', 3, 'L1', 'Sofía'),
    ]},
    { dim: 'relaciones', title: 'Relaciones', courses: [
      mkCourse('Da feedback sin rodeos', 'relaciones', 4, 'L3', 'Nora'),
      mkCourse('Escucha de verdad', 'relaciones', 4, 'L2', 'Leo'),
      mkCourse('Resuelve un conflicto', 'relaciones', 5, 'L4', 'Nora'),
      mkCourse('Pide ayuda sin culpa', 'relaciones', 3, 'L2', 'Iván'),
    ]},
    { dim: 'proposito', title: 'Propósito', courses: [
      mkCourse('Encuentra tu “por qué”', 'proposito', 5, 'L2', 'Leo'),
      mkCourse('Alinea metas con valores', 'proposito', 4, 'L3', 'Sofía'),
      mkCourse('Diseña tu próximo trimestre', 'proposito', 5, 'L3', 'Mateo'),
    ]},
    { dim: 'estabilidad', title: 'Estabilidad', courses: [
      mkCourse('Tu presupuesto en 1 hoja', 'estabilidad', 5, 'L1', 'Iván'),
      mkCourse('Construye un fondo de paz', 'estabilidad', 4, 'L2', 'Iván'),
      mkCourse('Rutinas que se sostienen', 'estabilidad', 4, 'L2', 'Aria'),
    ]},
  ],
};

// Diagnóstico situacional — banco de preguntas (subconjunto representativo)
const QUESTIONS = [
  { dim: 'carrera',     text: 'Tengo claridad sobre las habilidades que necesito para crecer en mi rol.' },
  { dim: 'carrera',     text: 'Recibo feedback útil sobre mi desempeño con regularidad.' },
  { dim: 'carrera',     text: 'Sé qué pasos dar para llegar a mi próximo nivel profesional.' },
  { dim: 'proposito',   text: 'Mi trabajo diario se conecta con algo que me importa.' },
  { dim: 'proposito',   text: 'Sé hacia dónde quiero llevar mi carrera en los próximos años.' },
  { dim: 'proposito',   text: 'Mis metas reflejan lo que de verdad valoro.' },
  { dim: 'relaciones',  text: 'Puedo expresar desacuerdos con mi equipo sin tensión.' },
  { dim: 'relaciones',  text: 'Cuento con personas en el trabajo en quienes confío.' },
  { dim: 'relaciones',  text: 'Pido ayuda cuando la necesito, sin sentir culpa.' },
  { dim: 'salud',       text: 'Tengo energía suficiente para sostener mi jornada.' },
  { dim: 'salud',       text: 'Duermo lo necesario para rendir bien.' },
  { dim: 'salud',       text: 'Mantengo hábitos de movimiento durante la semana.' },
  { dim: 'paz',         text: 'Manejo el estrés sin que afecte mis decisiones.' },
  { dim: 'paz',         text: 'Logro desconectarme del trabajo al terminar el día.' },
  { dim: 'paz',         text: 'Cuando algo me preocupa, puedo calmar mi mente.' },
  { dim: 'estabilidad', text: 'Mis finanzas personales me dan tranquilidad.' },
  { dim: 'estabilidad', text: 'Tengo rutinas estables que me dan estructura.' },
  { dim: 'estabilidad', text: 'Cuento con una base para enfrentar imprevistos.' },
];
const SCALE = [
  { v: 1, label: 'Nunca' },
  { v: 2, label: 'Rara vez' },
  { v: 3, label: 'A veces' },
  { v: 4, label: 'Casi siempre' },
  { v: 5, label: 'Siempre' },
];
const TOTAL_QUESTIONS = 22; // el banco completo

// Badges
const BADGES = [
  { name: 'Primeros pasos', dim: 'carrera', earned: true },
  { name: 'Madrugador', dim: 'salud', earned: true },
  { name: 'Mente clara', dim: 'paz', earned: true },
  { name: 'Buen colega', dim: 'relaciones', earned: true },
  { name: 'Norte fijo', dim: 'proposito', earned: false },
  { name: 'Base firme', dim: 'estabilidad', earned: false },
];

// Equipo (Vista del Líder)
const TEAM = [
  { name: 'Marcos Beltrán',  initials: 'MB', completion: 92, level: 'L4', nps: 9, gap: +28 },
  { name: 'Anjali Rao',      initials: 'AR', completion: 88, level: 'L4', nps: 9, gap: +24 },
  { name: 'Priya N.',        initials: 'PN', completion: 81, level: 'L3', nps: 8, gap: +22 },
  { name: 'Diego Fuentes',   initials: 'DF', completion: 74, level: 'L3', nps: 7, gap: +18 },
  { name: 'Sara Lindqvist',  initials: 'SL', completion: 69, level: 'L3', nps: 8, gap: +16 },
  { name: 'Tomás Becker',    initials: 'TB', completion: 58, level: 'L2', nps: 6, gap: +13 },
  { name: 'Wei Chen',        initials: 'WC', completion: 54, level: 'L2', nps: 7, gap: +11 },
  { name: 'Lucía Moreno',    initials: 'LM', completion: 47, level: 'L2', nps: 6, gap: +9 },
];

// Gap de equipo: promedio entrada vs salida por dimensión (ROI)
const TEAM_GAP = {
  carrera:     { entry: 44, exit: 69 },
  proposito:   { entry: 39, exit: 60 },
  relaciones:  { entry: 51, exit: 71 },
  salud:       { entry: 36, exit: 66 },
  paz:         { entry: 42, exit: 61 },
  estabilidad: { entry: 47, exit: 70 },
};

window.HG = {
  DIMS, PERSONAL, LEVELS, MATRIX, AI_MENTORS, CATALOG, QUESTIONS, SCALE,
  TOTAL_QUESTIONS, BADGES, TEAM, TEAM_GAP,
  dim: (k) => DIMS.find((d) => d.key === k),
};
