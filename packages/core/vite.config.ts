import { defineConfig } from "vite-plus";
import solid from "vite-plugin-solid";

import { solidTest } from "../../tooling/solid-test";

export default defineConfig({
  pack: {
    entry: ["src/index.tsx"],
    plugins: [solid()],
    dts: { tsgo: true },
    exports: false,
    clean: true,
  },
  test: solidTest({
    client: ["src/**/__tests__/**/*.test.{ts,tsx}"],
  }),
});
