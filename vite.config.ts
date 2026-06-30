import { defineConfig } from "vite-plus";

import { solidTest } from "./tooling/solid-test";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {},
  test: solidTest({
    client: [
      "src/**/__tests__/**/*.test.{ts,tsx}",
      "dev/**/__tests__/**/*.test.{ts,tsx}",
      "test/*.test.{ts,tsx}",
    ],
    coverageExclude: ["src/**/__tests__/**", "src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
    coverageInclude: ["src/**/*.{ts,tsx}"],
    ssr: ["test/server.test.tsx"],
  }),
});
