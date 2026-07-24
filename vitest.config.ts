import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: [
      "e2e/**",
      "node_modules/**",
      // Owned by vitest.integration.config.ts (environment: "node", run by `npm run test:integration`).
      // Collecting them here ran integration tests under jsdom, where Node's Buffer is not
      // `instanceof` the jsdom realm's Uint8Array, and produced a misleading "skipped" count.
      "**/*.integration.test.ts",
      // Build output: a production build copies specs into .next/standalone, which vitest would
      // otherwise collect and report as phantom failures.
      ".next/**",
    ],
  },
});
