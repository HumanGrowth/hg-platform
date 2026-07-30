import { redirect } from "next/navigation";

// Sprint Tarde · TASK 5 — la biblioteca de cursos legacy se retira: /eventos pasa
// a ser eventos de comunidad. Cualquier detalle de curso legacy → /modulos.
export default function LegacyCourseDetailRedirect() {
  redirect("/modulos");
}
