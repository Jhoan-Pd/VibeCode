/**
 * Mensajes para los errores que Auth.js envía a /login?error=… (pages.error = "/login").
 * Así la persona nunca ve la página genérica «Server error» de Auth.js.
 */
export function mensajeErrorAuth(codigo: string | undefined): string | null {
  if (!codigo) return null;
  switch (codigo) {
    case "Configuration":
      return "No pudimos iniciar sesión por un problema de configuración del servidor. Si administras la app, revisa que AUTH_SECRET y DATABASE_URL estén definidas en Vercel (Settings → Environment Variables) y vuelve a desplegar.";
    case "CredentialsSignin":
      return "Correo o contraseña incorrectos.";
    case "AccessDenied":
      return "No tienes permiso para entrar con esa cuenta.";
    case "OAuthAccountNotLinked":
    case "OAuthCallbackError":
    case "OAuthSignin":
      return "No se pudo entrar con GitHub. Inténtalo de nuevo o entra con tu correo.";
    case "Verification":
      return "El enlace de acceso venció o ya se usó.";
    default:
      return "No se pudo iniciar sesión. Inténtalo de nuevo.";
  }
}
