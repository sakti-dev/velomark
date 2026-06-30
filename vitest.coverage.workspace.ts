import type { TestProjectInlineConfiguration } from "vite-plus";

export default [
  {
    extends: "./vitest.config.ts",
    test: {
      name: "client",
    },
  },
  {
    extends: "./vitest.ssr.config.ts",
    mode: "ssr",
    test: {
      name: "ssr",
    },
  },
] satisfies TestProjectInlineConfiguration[];
