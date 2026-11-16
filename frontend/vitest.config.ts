import preact from "@preact/preset-vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Exercise the same compatibility runtime used by the production build.
  plugins: [preact()],
  test: {
    // The default CJS entry uses native require(), which bypasses Vite's
    // React-to-Preact aliases. Its ESM entry exercises our actual runtime.
    alias: {
      "@testing-library/react": fileURLToPath(
        new URL(
          "./node_modules/@testing-library/react/dist/@testing-library/react.esm.js",
          import.meta.url,
        ),
      ),
    },
    server: { deps: { inline: [/@testing-library\/react/] } },
    environment: "jsdom",
    // Local dev flags must not change the baseline assumed by unit tests.
    // Feature registration tests opt in explicitly with vi.stubEnv.
    env: {
      VITE_ENABLE_HILL: "false",
      VITE_ENABLE_DES: "false",
      VITE_ENABLE_DES_DEMO: "false",
      VITE_ENABLE_RSA: "false",
      VITE_ENABLE_DIFFIE_HELLMAN: "false",
    },
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: true,
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
