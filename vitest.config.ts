import solidPlugin from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

const WEB_TRANSFORM_RE = /\.[jt]sx$/;
const CLIENT_TEST_GLOBS = [
  "src/**/__tests__/**/*.test.{ts,tsx}",
  "dev/**/__tests__/**/*.test.{ts,tsx}",
  "test/*.test.{ts,tsx}",
];
const SSR_TEST_GLOBS = ["test/server.test.{ts,tsx}"];

export default defineConfig(({ mode }) => {
  // to test in server environment, run with "--mode ssr" or "--mode test:ssr" flag
  // loads only server.test.ts file
  const testSSR = mode === "test:ssr" || mode === "ssr";

  return {
    plugins: [
      solidPlugin({
        // https://github.com/solidjs/solid-refresh/issues/29
        hot: false,
        // For testing SSR we need to do a SSR JSX transform
        solid: { generate: testSSR ? "ssr" : "dom" },
      }),
    ],
    test: {
      watch: false,
      isolate: !testSSR,
      env: {
        NODE_ENV: testSSR ? "production" : "development",
        DEV: testSSR ? "" : "1",
        SSR: testSSR ? "1" : "",
        PROD: testSSR ? "1" : "",
      },
      environment: testSSR ? "node" : "jsdom",
      transformMode: { web: [WEB_TRANSFORM_RE] },
      ...(testSSR
        ? {
            include: SSR_TEST_GLOBS,
          }
        : {
            include: CLIENT_TEST_GLOBS,
            exclude: SSR_TEST_GLOBS,
          }),
    },
    resolve: {
      conditions: testSSR ? ["node"] : ["browser", "development"],
    },
  };
});
