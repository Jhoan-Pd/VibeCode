import { describe, expect, it } from "vitest";
import { mensajeErrorAuth } from "@/lib/errores-auth";

describe("mensajeErrorAuth", () => {
  it("sin código no muestra nada", () => {
    expect(mensajeErrorAuth(undefined)).toBeNull();
    expect(mensajeErrorAuth("")).toBeNull();
  });
  it("explica el error de configuración y cómo resolverlo", () => {
    expect(mensajeErrorAuth("Configuration")).toContain("AUTH_SECRET");
  });
  it("traduce los errores conocidos y da un mensaje genérico al resto", () => {
    expect(mensajeErrorAuth("CredentialsSignin")).toBe("Correo o contraseña incorrectos.");
    expect(mensajeErrorAuth("OAuthSignin")).toContain("GitHub");
    expect(mensajeErrorAuth("<script>")).toBe("No se pudo iniciar sesión. Inténtalo de nuevo.");
  });
});
