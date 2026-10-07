import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { PerfilInput, RegisterInput } from "@/schemas/auth";

/** bcryptjs (JS puro) funciona en cualquier runtime serverless sin compilar módulos nativos. */
const COSTO_BCRYPT = 12;

// Hash de relleno para igualar tiempos cuando el correo no existe (evita enumerar usuarios por latencia).
const HASH_RELLENO = bcrypt.hashSync("relleno-no-valido", COSTO_BCRYPT);

export class EmailEnUsoError extends Error {
  constructor() {
    super("Ya existe una cuenta con ese correo");
    this.name = "EmailEnUsoError";
  }
}

export async function registrarUsuario(input: RegisterInput) {
  const existente = await db.usuario.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existente) throw new EmailEnUsoError();
  const passwordHash = await bcrypt.hash(input.password, COSTO_BCRYPT);
  return db.usuario.create({
    data: { nombre: input.nombre, email: input.email, passwordHash },
    select: { id: true, email: true, nombre: true },
  });
}

/** Verifica credenciales. Devuelve el usuario o null (sin revelar si falló el correo o la clave). */
export async function verificarCredenciales(email: string, password: string) {
  const usuario = await db.usuario.findUnique({ where: { email } });
  const hash = usuario?.passwordHash ?? HASH_RELLENO;
  const ok = await bcrypt.compare(password, hash);
  if (!usuario || !usuario.passwordHash || !ok) return null;
  return usuario;
}

/**
 * Crea o enlaza el usuario de GitHub. Si ya existe una cuenta con el mismo correo (verificado por GitHub)
 * se enlaza en lugar de duplicar.
 */
export async function upsertUsuarioGithub(datos: { githubId: string; email: string; nombre?: string | null; imagen?: string | null }) {
  const porGithub = await db.usuario.findUnique({ where: { githubId: datos.githubId } });
  if (porGithub) return porGithub;

  const porEmail = await db.usuario.findUnique({ where: { email: datos.email } });
  if (porEmail) {
    return db.usuario.update({
      where: { id: porEmail.id },
      data: { githubId: datos.githubId, imagen: porEmail.imagen ?? datos.imagen ?? null },
    });
  }
  return db.usuario.create({
    data: { githubId: datos.githubId, email: datos.email, nombre: datos.nombre ?? null, imagen: datos.imagen ?? null },
  });
}

export function obtenerUsuario(id: string) {
  return db.usuario.findUnique({
    where: { id },
    select: { id: true, nombre: true, email: true, imagen: true, nivel: true, creadoEn: true },
  });
}

export function actualizarPerfil(id: string, datos: PerfilInput) {
  return db.usuario.update({
    where: { id },
    data: { nivel: datos.nivel, ...(datos.nombre ? { nombre: datos.nombre } : {}) },
    select: { id: true, nombre: true, nivel: true },
  });
}
