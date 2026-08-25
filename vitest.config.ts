import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    clearMocks: true,
    exclude: [...configDefaults.exclude, "dashboard/**"],
  },
});
