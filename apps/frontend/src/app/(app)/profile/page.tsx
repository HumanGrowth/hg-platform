import { redirect } from "next/navigation";

// /profile se unificó en /perfil (app-polish-04).
export default function ProfileRedirect() {
  redirect("/perfil");
}
