import { defineConfig } from "vitest/config";

// Vite/Vitest's config loader requires a default export from this file.
// oxlint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
  },
});
