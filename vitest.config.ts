import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Los componentes usan el runtime automático de JSX (como Next), sin `import React`.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
