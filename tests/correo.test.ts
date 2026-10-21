import { describe, expect, it } from "vitest";
import { problemaCorreo } from "@/lib/correo";
import { RegisterSchema } from "@/schemas/auth";

describe("problemaCorreo", () => {
  it("acepta correos normales", () => {
    for (const c of ["ana@gmail.com", "diego.mallama123@gmail.com", "a+b@uni.edu.co", " Ana@Correo.com "]) expect(problemaCorreo(c)).toBeNull();
  });

  it("explica las tildes y la ñ y sugiere cómo escribirlo", () => {
    const m = problemaCorreo("dieguiño123mallama@gmail.com");
    expect(m).toContain("«ñ»");
    expect(m).toContain("dieguino123mallama@gmail.com");
    expect(problemaCorreo("josé@correo.com")).toContain("«é»");
  });

  it("dice qué falta en lugar de un mensaje genérico", () => {
    expect(problemaCorreo("")).toBe("Escribe tu correo.");
    expect(problemaCorreo("ana gmail.com")).toContain("espacios");
    expect(problemaCorreo("anagmail.com")).toContain("«@»");
    expect(problemaCorreo("ana@@gmail.com")).toContain("una «@»");
    expect(problemaCorreo("@gmail.com")).toContain("antes de la «@»");
    expect(problemaCorreo("ana@gmail")).toContain("dominio");
    expect(problemaCorreo("ana@-gmail.com")).toContain("nombre@dominio.com");
  });

  it("el registro devuelve el mensaje específico", () => {
    const r = RegisterSchema.safeParse({ nombre: "Diego", email: "dieguiño@gmail.com", password: "12345678" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toContain("«ñ»");
  });
});
