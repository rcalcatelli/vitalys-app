/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { coverageConfigDefaults } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      // Declarar `include` alcanza para que TODO archivo bajo `src/` cuente en el
      // reporte aunque ningún test lo importe (Vitest 4 ya no tiene `coverage.all`:
      // ese es el comportamiento por default en cuanto se fija `include`) — mismo
      // espíritu que el bundle de JaCoCo en el backend: nada queda afuera en silencio.
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        ...coverageConfigDefaults.exclude,
        "src/main.tsx", // bootstrap de Vite/React: solo monta <App/>, no hay lógica que testear.
        "src/vite-env.d.ts",
        "src/test/**", // helpers de tests (setup, render wrappers), no código de la app.
        "src/types/**", // solo tipos/interfaces (RolUsuario, DTOs): sin líneas ejecutables.
      ],
      // Umbral de líneas al 0.90 (90%), coherente con el gate de JaCoCo del backend
      // (BUNDLE/LINE/COVEREDRATIO >= 0.90). El build de CI rompe si no se alcanza.
      thresholds: {
        lines: 90,
      },
    },
  },
});
