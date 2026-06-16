import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const REFRESH_COOKIE = "hg_refresh";

// Rutas autenticadas (route groups (app)/(admin) no aparecen en la URL).
const PROTECTED = ["/home", "/library", "/profile", "/admin"];
const AUTH_PAGES = ["/login", "/accept-invite"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(REFRESH_COOKIE)?.value);

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  // En /login con sesión activa -> a /home. (accept-invite se deja pasar: el
  // usuario puede querer aceptar otra invitación.)
  if (pathname === "/login" && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }
  // La landing pública "/" lleva al usuario autenticado directo a su app.
  if (pathname === "/" && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }
  void isAuthPage;
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/home/:path*", "/library/:path*", "/profile/:path*", "/admin/:path*", "/login"],
};
