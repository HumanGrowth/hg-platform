import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const REFRESH_COOKIE = "hg_refresh";
const THEME_COOKIE = "hg-theme";
const THEME_VALUES = new Set(["light", "dark"]);

// Rutas autenticadas (route groups (app)/(admin) no aparecen en la URL).
const PROTECTED = [
  "/home", "/dimensiones", "/eventos", "/modulos", "/perfil", "/profile", "/path", "/radar", "/team", "/onboarding", "/admin",
];
const AUTH_PAGES = ["/login", "/accept-invite"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(REFRESH_COOKIE)?.value);

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);

  // Theme flag: ?theme=light|dark persiste la
  // cookie `hg-theme` y la refleja en la MISMA request (reescribimos el
  // header Cookie que ven los server components) para que no haya flash.
  const themeParam = req.nextUrl.searchParams.get("theme");
  let themeOverride: string | null = null;
  if (themeParam && THEME_VALUES.has(themeParam)) {
    themeOverride = themeParam;
  }

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

  if (themeOverride) {
    const requestHeaders = new Headers(req.headers);
    const existing = (requestHeaders.get("cookie") ?? "")
      .split(";")
      .map((c) => c.trim())
      .filter((c) => c && !c.startsWith(`${THEME_COOKIE}=`));
    existing.push(`${THEME_COOKIE}=${themeOverride}`);
    requestHeaders.set("cookie", existing.join("; "));

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.cookies.set(THEME_COOKIE, themeOverride, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/home/:path*",
    "/dimensiones/:path*",
    "/eventos/:path*",
    "/modulos/:path*",
    "/perfil/:path*",
    "/profile/:path*",
    "/path/:path*",
    "/radar/:path*",
    "/team/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
    "/login",
  ],
};
