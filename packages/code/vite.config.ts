import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    dts: { tsgo: true },
    exports: false,
    clean: true,
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
