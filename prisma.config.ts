import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7: la configuración del CLI vive aquí.
 * - La CLI (db push / migrate) usa DIRECT_URL (conexión directa o "session pooler").
 * - La app en runtime usa DATABASE_URL (pooler) a través de lib/db.ts.
 * Si DIRECT_URL no existe, cae a DATABASE_URL.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
