import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Cliente Prisma singleton (Prisma 7 usa "driver adapters": el driver es `pg`, sin binario de Rust).
 * En desarrollo se guarda en globalThis para sobrevivir al hot-reload sin abrir conexiones de más.
 * En serverless (Vercel) cada instancia usa un pool muy pequeño: la agrupación real la hace el pooler de la BD.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function crearCliente(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("Falta la variable de entorno DATABASE_URL.");
  }
  const adapter = new PrismaPg({ connectionString, max: 5, idleTimeoutMillis: 10_000 });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? crearCliente();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
