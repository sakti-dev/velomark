# Vite+ Simplification Design

## Goal

Collapse velomark's multi-file build/test/lint configuration sprawl onto the
`classic-come` vite-plus template shape, using `vp pack` (tsdown) as the sole
bundler and `vp check` (oxlint/oxfmt) as the sole linter/formatter.

Reference template: `/home/eekrain/CODE/classic-come`.

## Current State

The repo carries the remnants of two prior toolchains layered on top of
vite-plus:

- Four vitest config files (`vitest.config.ts`, `vitest.ssr.config.ts`,
  `vitest.shared.ts`, `vitest.coverage.workspace.ts`) to split client vs SSR
  test environments.
- A `tsup` + `tsup-preset-solid` build that auto-writes `package.json` export
  conditions and emits a separate `dev.js` dev entry.
- Legacy lint/format deps that vite-plus now supersedes: `@biomejs/biome`,
  `ultracite`, `eslint` + `@typescript-eslint/*` + three `eslint-plugin-*`,
  `prettier`, `husky`, `lint-staged`, `concurrently`, `esbuild`,
  `esbuild-plugin-solid`.
- An `env.d.ts` carrying an `ImportMeta.env` augmentation no source file reads.
- An `.agents/` directory holding a bespoke `AGENTS.md` rather than the
  template's root-level VITE PLUS block.

What already works and should be preserved:

- `vp install` / `vp check` / `pnpm exec tsc --noEmit` all pass after the prior
  fixup commit (`3afea99`).
- `vite-plugin-solid` is compatible with Vite 8 (vite-plus-core is a Vite 8
  fork); confirmed by the Solid team in solidjs/solid#2618. The Solid JSX
  transform therefore runs inside `vp pack`'s plugin pipeline.
- A `dev/` playground app with its own `dev/vite.config.ts` (tailwind + solid).
- A `scripts/pack-and-test-consumer.mjs` smoke test verifying the published
  tarball builds in a fresh consumer.

## Decision

Adopt the **template-faithful single-build** approach (Approach A from the
design discussion). Rationale:

- vite-plus is the intended toolchain; tsup, biome, ultracite, eslint, and
  prettier are redundant now that `vp pack` / `vp check` exist.
- `vite-plugin-solid` gives the Solid JSX transform inside `vp pack`, so tsup's
  only remaining purpose (Solid conditions) is gone.
- The `dev.js` dev entry and `solid.development` export condition are an HMR
  optimization, not a runtime correctness requirement. Dropping them matches the
  template's single-build shape and removes the auto-write of `package.json`
  that `tsup-preset-solid` performs.
- SSR testing is a real Solid concern, so the SSR test project is retained — but
  as a named vitest project inside the root config, not a separate file.

Linting and formatting come from vite-plus's built-in oxlint/oxfmt via the
`lint` and `fmt` config blocks. `biome` and `ultracite` are removed entirely.

## Scope

### Files to delete

- `env.d.ts` — unused `ImportMeta.env` augmentation.
- `vitest.config.ts`, `vitest.ssr.config.ts`, `vitest.shared.ts`,
  `vitest.coverage.workspace.ts` — collapsed into root `vite.config.ts`.
- `tsup.config.ts` — replaced by `vp pack`.
- `.agents/` directory — `AGENTS.md` moves to repo root as the template's VITE
  PLUS block. The ultracite skill under `.agents/skills/ultracite/` is removed
  with the dep.

### Files to add

- `vite.config.ts` (root) — see Structure below.
- `AGENTS.md` (root) — VITE PLUS block copied from `classic-come/AGENTS.md`.

### Files to rewrite

- `package.json` — scripts, devDeps, exports, `packageManager` → `devEngines`.
- `tsconfig.json` — template base + Solid JSX options.
- `pnpm-workspace.yaml` — drop `allowBuilds.esbuild` to match template.

### Files kept untouched

- `dev/**` — playground keeps its own `dev/vite.config.ts`.
- `scripts/pack-and-test-consumer.mjs` — stays as `test:packed-consumer`.
- `src/**`, `test/**` — source and tests unchanged.

## Structure

### `vite.config.ts`

```ts
import { defineConfig } from "vite-plus";
import solid from "vite-plugin-solid";

export default defineConfig({
  staged: { "*": "vp check --fix" },
  pack: {
    // Solid JSX transform runs as a pack plugin (Vite 8 compatible)
    plugin: [solid()],
    dts: { tsgo: true },
    exports: true,
    clean: true,
    copy: [{ from: "src/theme/styles.css", to: "styles.css" }],
  },
  test: {
    projects: [
      {
        plugins: [solid({ solid: { generate: "dom" } })],
        test: {
          name: "client",
          environment: "jsdom",
          include: [
            "src/**/__tests__/**/*.test.{ts,tsx}",
            "dev/**/__tests__/**/*.test.{ts,tsx}",
            "test/*.test.{ts,tsx}",
          ],
          exclude: ["test/server.test.tsx"],
        },
      },
      {
        plugins: [solid({ solid: { generate: "ssr" } })],
        test: {
          name: "ssr",
          environment: "node",
          include: ["test/server.test.tsx"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/__tests__/**", "src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
      thresholds: { branches: 75, functions: 80, lines: 80, statements: 80 },
    },
  },
  lint: { options: { typeAware: true, typeCheck: true } },
  fmt: {},
});
```

The exact field names (`pack.plugin` vs `pack.plugins`, `pack.copy`) are to be
confirmed against the installed vite-plus `PackUserConfig` type during
implementation. The intent — Solid as a pack plugin, dts via tsgo, auto exports,
CSS copied — is fixed.

### `package.json` (delta)

Scripts become template-aligned:

```jsonc
"scripts": {
  "build": "vp pack",
  "dev": "vp dev dev",
  "test": "vp test",
  "test:packed-consumer": "node ./scripts/pack-and-test-consumer.mjs",
  "check": "vp check",
  "prepublishOnly": "vp run build",
  "prepare": "vp config"
}
```

devDependencies removed: `@biomejs/biome`, `ultracite`, `eslint`,
`@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`,
`eslint-plugin-eslint-comments`, `eslint-plugin-no-only-tests`, `prettier`,
`tsup`, `tsup-preset-solid`, `esbuild`, `esbuild-plugin-solid`, `husky`,
`lint-staged`, `concurrently`, `jsdom` (bundled by vite-plus).

devDependencies kept: `solid-js`, `vite`/`vitest`/`vite-plus` (`catalog:`),
`vite-plugin-solid`, `@vitest/coverage-v8`, `@testing-library/jest-dom`,
`@types/node`, `typescript`, `@typescript/native-preview`, tailwind playground
deps (`@tailwindcss/vite`, `tailwindcss`, `tw-animate-css`).

`engines` + `packageManager` → `devEngines` matching the template:

```jsonc
"devEngines": { "packageManager": { "name": "pnpm", "version": "11.5.3", "onFail": "download" } }
```

`exports` simplified to whatever `vp pack` auto-generates plus a hand-written
`./styles.css` subpath:

```jsonc
"exports": {
  ".": { /* generated by pack.exports */ },
  "./styles.css": "./dist/styles.css"
}
```

The current `solid` / `development` / `dev.js` conditions are dropped.

### `tsconfig.json`

Template base plus Solid JSX:

```jsonc
{
  "compilerOptions": {
    "target": "esnext",
    "lib": ["es2023", "DOM", "DOM.Iterable"],
    "moduleDetection": "force",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "resolveJsonModule": true,
    "types": ["node"],
    "strict": true,
    "noUnusedLocals": true,
    "declaration": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "jsx": "preserve",
    "jsxImportSource": "solid-js"
  }
}
```

Note: `verbatimModuleSyntax` + Solid's `type`-qualified imports may surface new
type errors in `src/`; those are fixed as they appear, not pre-emptively.

## Risks & Verification

- **`vp pack` Solid JSX support** — de-risked by solidjs/solid#2618, but the
  exact `pack` plugin field name and whether dts (tsgo) handles Solid's types
  cleanly are verified by running `vp pack` and inspecting `dist/`.
- **Auto-generated `exports`** — verify the emitted `./dist/index.mjs` (or
  similar) matches what the packed-consumer smoke test imports; adjust
  `pack.exports` / hand-write if Solid needs a custom condition.
- **`verbatimModuleSyntax`** — may require adding `type` qualifiers to existing
  value/type-mixed imports. Caught by `vp check --fix` and `tsc`.
- **Coverage thresholds** — ensure the new single-config coverage collection
  still satisfies the existing gate.

Definition of done:

1. `vp install`, `vp check`, `vp test`, and `vp pack` all pass.
2. `pnpm exec tsc --noEmit` passes.
3. `pnpm run test:packed-consumer` passes (published tarball builds in a
   consumer).
4. No `biome`, `ultracite`, `tsup`, `eslint`, or `prettier` references remain in
   the repo.
