import { redirect } from "next/navigation";

// Entrada: derivar a la app. El middleware reenvía a /login si no hay sesión.
export default function RootPage() {
  redirect("/home");
}
