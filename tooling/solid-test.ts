import solid from "vite-plugin-solid";

export interface SolidTestOptions {
  client: string[];
  coverageExclude?: string[];
  coverageInclude?: string[];
  ssr?: string[];
}

const COVERAGE_THRESHOLDS = {
  branches: 75,
  functions: 80,
  lines: 80,
  statements: 80,
} as const;

/**
 * Shared Solid test configuration (Vite+ "Composing Configuration Files" pattern).
 * Returns a `test` block with a jsdom client project (solid dom) and an optional
 * node SSR project (solid ssr). Each package composes this into its vite.config.ts.
 */
export function solidTest(opts: SolidTestOptions) {
  const ssr = opts.ssr?.length ? opts.ssr : [];
  return {
    coverage: {
      provider: "v8" as const,
      include: opts.coverageInclude ?? [],
      exclude: opts.coverageExclude ?? ["**/__tests__/**", "**/*.test.{ts,tsx}", "**/*.d.ts"],
      thresholds: COVERAGE_THRESHOLDS,
    },
    projects: [
      {
        mode: "test" as const,
        plugins: [solid({ hot: false, solid: { generate: "dom" } })],
        test: {
          name: "client",
          environment: "jsdom" as const,
          testTimeout: 30_000,
          env: {
            NODE_ENV: "development",
            DEV: "1",
            SSR: "",
            PROD: "",
          },
          include: opts.client,
          exclude: ssr,
        },
      },
      ...(ssr.length
        ? [
            {
              mode: "ssr" as const,
              plugins: [solid({ hot: false, solid: { generate: "ssr" } })],
              resolve: { conditions: ["node"] },
              test: {
                name: "ssr",
                environment: "node" as const,
                env: {
                  NODE_ENV: "production",
                  DEV: "",
                  SSR: "1",
                  PROD: "1",
                },
                include: ssr,
                isolate: false,
              },
            },
          ]
        : []),
    ],
  };
}
