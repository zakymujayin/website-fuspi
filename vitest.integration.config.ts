import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    globals: true,
    include: [
      "src/**/*.integration.test.ts",
      "tests/**/*.integration.test.ts",
    ],
    fileParallelism: false,
  },
});
