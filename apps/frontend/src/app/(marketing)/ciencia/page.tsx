import { redirect } from "next/navigation";

// La página de ciencia se renombró a "El Método" (/metodo). Redirect permanente
// para no romper enlaces antiguos.
export default function CienciaPage() {
  redirect("/metodo");
}
