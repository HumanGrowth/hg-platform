import { redirect } from "next/navigation";

// /radar se unificó en /perfil (app-polish-04).
export default function RadarRedirect() {
  redirect("/perfil");
}
