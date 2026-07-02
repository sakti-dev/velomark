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
    client: ["dev/**/__tests__/**/*.test.{ts,tsx}", "scripts/__tests__/**/*.test.{ts,tsx}"],
  }),
});
