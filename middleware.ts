import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

const PAGINAS_PROTEGIDAS = ["/dashboard", "/analyze", "/analysis", "/perfil"];
const API_PROTEGIDAS = ["/api/analyze", "/api/analysis", "/api/gist", "/api/perfil"];
const PAGINAS_SOLO_INVITADOS = ["/login", "/register"];

const coincide = (ruta: string, prefijos: string[]) => prefijos.some((p) => ruta === p || ruta.startsWith(`${p}/`));

/**
 * Protege rutas ANTES de renderizar. Es la primera barrera; además cada API route y cada página
 * del servidor vuelven a comprobar la sesión con auth() (defensa en profundidad).
 */
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const autenticado = !!req.auth;

  if (!autenticado && coincide(pathname, API_PROTEGIDAS)) {
    return NextResponse.json({ error: "No autorizado. Inicia sesión." }, { status: 401 });
  }

  if (!autenticado && coincide(pathname, PAGINAS_PROTEGIDAS)) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  if (autenticado && coincide(pathname, PAGINAS_SOLO_INVITADOS)) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/analyze/:path*", "/analysis/:path*", "/perfil/:path*", "/login", "/register", "/api/analyze/:path*", "/api/analysis/:path*", "/api/gist/:path*", "/api/perfil/:path*"],
};
