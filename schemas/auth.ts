import { z } from "zod";
import { NivelSchema } from "./common";

export const RegisterSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre").max(80),
  email: z.string().trim().toLowerCase().email("Correo no válido").max(200),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "Máximo 72 caracteres (límite de bcrypt)"),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72),
});

export const PerfilSchema = z.object({
  nombre: z.string().trim().min(2).max(80).optional(),
  nivel: NivelSchema,
});
export type PerfilInput = z.infer<typeof PerfilSchema>;
