import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { authConfig } from "./auth.config";
import { LoginSchema } from "./schemas/auth";
import { upsertUsuarioGithub, verificarCredenciales } from "./services/usuarios";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
  }
}

/**
 * Auth.js v5 con sesión JWT (necesario para el proveedor de credenciales) y SIN adaptador:
 * los usuarios viven en nuestra tabla `usuarios`. En el login con GitHub se hace upsert manual
 * en el callback jwt; el id interno de la BD viaja en el token como `uid`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    GitHub, // lee AUTH_GITHUB_ID y AUTH_GITHUB_SECRET del entorno
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = LoginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const usuario = await verificarCredenciales(parsed.data.email, parsed.data.password);
        if (!usuario) return null;
        return { id: usuario.id, name: usuario.nombre, email: usuario.email, image: usuario.imagen };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "github" && profile) {
        const githubId = String(profile.id);
        // Algunos usuarios ocultan su correo: usamos el correo "noreply" de GitHub como identificador estable.
        const email = (profile.email as string | null | undefined)?.toLowerCase() || `${githubId}+${profile.login}@users.noreply.github.com`;
        const usuario = await upsertUsuarioGithub({
          githubId,
          email,
          nombre: (profile.name as string | null | undefined) ?? (profile.login as string | undefined),
          imagen: profile.avatar_url as string | undefined,
        });
        token.uid = usuario.id;
      } else if (user?.id) {
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      return session;
    },
  },
});
