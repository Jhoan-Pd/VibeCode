import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { PerfilInput, RegisterInput } from "@/schemas/auth";

/** bcryptjs (JS puro) funciona en cualquier runtime serverless sin compilar módulos nativos. */
const COSTO_BCRYPT = 12;

/**
 * Hash de relleno para igualar tiempos cuando el correo no existe (evita enumerar usuarios por latencia).
 * Se calcula la primera vez que se necesita (y una sola vez): con costo 12 tarda cientos de ms, y
 * hacerlo al importar el módulo bloqueaba el arranque en frío de cualquier ruta que lo importara.
 */
let hashRelleno: Promise<string> | null = null;
const obtenerHashRelleno = () => (hashRelleno ??= bcrypt.hash("relleno-no-valido", COSTO_BCRYPT));

/** Código de Prisma para una restricción única violada. */
const VIOLACION_UNICA = "P2002";
const esViolacionUnica = (e: unknown) => typeof e === "object" && e !== null && "code" in e && e.code === VIOLACION_UNICA;

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
  try {
    return await db.usuario.create({
      data: { nombre: input.nombre, email: input.email, passwordHash },
      select: { id: true, email: true, nombre: true },
    });
  } catch (e) {
    // Dos registros simultáneos con el mismo correo pasan la comprobación previa: la BD decide.
    if (esViolacionUnica(e)) throw new EmailEnUsoError();
    throw e;
  }
}

/** Verifica credenciales. Devuelve el usuario o null (sin revelar si falló el correo o la clave). */
export async function verificarCredenciales(email: string, password: string) {
  const usuario = await db.usuario.findUnique({ where: { email } });
  const hash = usuario?.passwordHash ?? (await obtenerHashRelleno());
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
