import { redirect } from "next/navigation";

// /radar/[pillar] se unificó en /perfil (app-polish-04).
export default function RadarPillarRedirect() {
  redirect("/perfil");
}
