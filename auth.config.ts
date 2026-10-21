import type { NextAuthConfig } from "next-auth";

/**
 * Configuración de Auth.js compatible con el runtime Edge (la usa el middleware).
 * No puede importar Prisma ni bcrypt: esos proveedores viven en auth.ts (runtime Node).
 */
export const authConfig = {
  // Los errores de Auth.js también van a /login (con ?error=…), donde se explican en español.
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  providers: [],
} satisfies NextAuthConfig;
