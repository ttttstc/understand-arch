import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["engine/arch/__tests__/**/*.test.mjs"],
  },
});
