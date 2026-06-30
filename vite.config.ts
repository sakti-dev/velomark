import { defineConfig } from "vite-plus";
import solid from "vite-plugin-solid";

const CLIENT_INCLUDE = [
  "src/**/__tests__/**/*.test.{ts,tsx}",
  "dev/**/__tests__/**/*.test.{ts,tsx}",
  "test/*.test.{ts,tsx}",
];

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  pack: {
    entry: ["src/index.tsx"],
    plugins: [solid()],
    dts: { tsgo: true },
    exports: true,
    clean: true,
    copy: [{ from: "src/theme/styles.css", to: "styles.css" }],
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/__tests__/**",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
      ],
      thresholds: {
        branches: 75,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    projects: [
      {
        plugins: [solid({ hot: false, solid: { generate: "dom" } })],
        resolve: { conditions: ["browser", "development"] },
        test: {
          name: "client",
          environment: "jsdom",
          env: {
            NODE_ENV: "development",
            DEV: "1",
            SSR: "",
            PROD: "",
          },
          include: CLIENT_INCLUDE,
          exclude: ["test/server.test.tsx"],
        },
      },
      {
        plugins: [solid({ hot: false, solid: { generate: "ssr" } })],
        mode: "ssr",
        resolve: { conditions: ["node"] },
        test: {
          name: "ssr",
          environment: "node",
          env: {
            NODE_ENV: "production",
            DEV: "",
            SSR: "1",
            PROD: "1",
          },
          include: ["test/server.test.tsx"],
          isolate: false,
        },
      },
    ],
  },
  lint: {
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {},
});
