export interface PageHeader {
  title: string;
  description: string;
}

interface Rule {
  test: (pathname: string) => boolean;
  header: PageHeader;
}

/**
 * Título + descripción real por ruta, para el top bar de SpatialCanvas
 * (tema dark). Reemplaza el switch Focus/Insight/Overview (retirado): en
 * vez de un control de "modo" en el chrome, cada página se identifica con
 * su propio título — aplica a TODA la app, no solo a /home.
 */
const RULES: Rule[] = [
  { test: (p) => p === "/home", header: { title: "Inicio", description: "Tu progreso, dimensión por dimensión." } },
  {
    test: (p) => p.startsWith("/dimensiones"),
    header: { title: "Dimensiones", description: "Las 6 dimensiones de tu crecimiento." },
  },
  {
    test: (p) => p.startsWith("/modulos"),
    header: { title: "Módulos", description: "Tu próximo paso de aprendizaje." },
  },
  { test: (p) => p.startsWith("/path"), header: { title: "Mi Ruta", description: "Tu recorrido personalizado." } },
  {
    test: (p) => p.startsWith("/plan-accion"),
    header: { title: "Plan de Acción", description: "Micro-retos y próximos pasos concretos." },
  },
  {
    test: (p) => p.startsWith("/eventos"),
    header: { title: "Eventos", description: "Sesiones en vivo y contenido de la comunidad." },
  },
  {
    test: (p) => p.startsWith("/perfil/editar"),
    header: { title: "Editar Perfil", description: "Actualizá tu información." },
  },
  { test: (p) => p.startsWith("/perfil"), header: { title: "Mi Perfil", description: "Tu radar, logros y progreso." } },
  { test: (p) => p.startsWith("/team"), header: { title: "Mi Equipo", description: "Seguimiento y progreso de tu equipo." } },
  {
    test: (p) => p.startsWith("/admin/org"),
    header: { title: "Panel de Organización", description: "Vista general y KPIs." },
  },
  {
    test: (p) => p.startsWith("/admin/empresa"),
    header: { title: "Mi Empresa", description: "Gestión de tu organización y equipos." },
  },
  { test: (p) => p.startsWith("/admin"), header: { title: "Modo Admin", description: "Herramientas de administración." } },
];

const DEFAULT_HEADER: PageHeader = { title: "Human Growth", description: "" };

export function getPageHeader(pathname: string): PageHeader {
  return RULES.find((r) => r.test(pathname))?.header ?? DEFAULT_HEADER;
}
