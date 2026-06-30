# Vite+ Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate velomark onto the `classic-come` vite-plus template shape — `vp pack` as the sole bundler, `vp check` (oxlint/oxfmt) as the sole linter/formatter — dropping tsup, biome, ultracite, eslint, and prettier.

**Architecture:** Single root `vite.config.ts` carries `pack` (tsdown + `vite-plugin-solid` for the JSX transform + tsgo dts + auto exports), `test` (two named vitest projects: client/jsdom + SSR/node), `lint`, and `fmt` blocks. The Solid `dev.js` dev entry and `solid.development` export condition are dropped (HMR optimization, not a correctness requirement).

**Tech Stack:** vite-plus 0.2.1 (Vite 8 fork, vitest 4.1.9, tsdown 0.22.x, oxlint, oxfmt), vite-plugin-solid, @typescript/native-preview (tsgo), Solid 1.9.

**Reference:** design at `docs/plans/2026-06-30-vite-plus-simplify-design.md`; template at `/home/eekrain/CODE/classic-come`.

**Verified config facts** (from `@voidzero-dev/vite-plus-core/dist/tsdown/index-types.d.ts`):

- `pack` block IS the tsdown `UserConfig` (`PackUserConfig extends UserConfig`).
- Valid fields: `entry`, `plugins` (`TsdownPluginOption`), `dts` (`WithEnabled<DtsOptions>`, supports `tsgo`), `exports` (`WithEnabled<ExportsOptions>`), `clean`, `copy` (`CopyOptions | CopyOptionsFn`).
- `lint?: OxlintConfig`, `fmt?: OxfmtConfig`, `test?: InlineConfig` (vitest), `staged?` are vite-plus top-level blocks.

---

### Task 1: Rewrite `tsconfig.json` to template base + Solid JSX

**Files:**

- Modify: `tsconfig.json`

**Step 1: Replace the file contents**

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
    "jsxImportSource": "solid-js",
  },
}
```

Changes vs current: `module`/`moduleResolution` `ESNext`/`bundler` → `nodenext`; add `moduleDetection`, `noUnusedLocals`, `declaration`, `allowImportingTsExtensions`, `verbatimModuleSyntax`; drop `allowSyntheticDefaultImports` (implied by esModuleInterop), `forceConsistentCasingInFileNames`, `noUncheckedIndexedAccess`, the `exclude` array. `lib` gains `es2023`.

**Step 2: Run typecheck and fix fallout**

Run: `pnpm exec tsc --noEmit`
Expected: likely new errors from `verbatimModuleSyntax` (value/type-mixed imports needing `type` qualifier) and `nodenext` resolution. Fix each by adding `type` to import specifiers or file extensions as the compiler directs. Do NOT disable `verbatimModuleSyntax`.

**Step 3: Verify green**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no output, exit 0)

**Step 4: Commit**

```bash
git add tsconfig.json <any src files fixed>
git commit -m "build: align tsconfig to vite-plus template (nodenext, verbatimModuleSyntax)"
```

---

### Task 2: Write the new root `vite.config.ts`

**Files:**

- Create: `vite.config.ts`

**Step 1: Write the config**

```ts
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
    projects: [
      {
        plugins: [solid({ solid: { generate: "dom" } })],
        test: {
          name: "client",
          environment: "jsdom",
          include: CLIENT_INCLUDE,
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
  lint: {
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {},
});
```

**Step 2: Typecheck the config**

Run: `pnpm exec tsc --noEmit`
Expected: PASS. If `pack.plugins` / `pack.copy` / `test.projects` shape errors appear, confirm against the installed `PackUserConfig` / vitest `InlineConfig` types and adjust the exact field shape — the field names are verified; only the element typing (e.g. `vite-plugin-solid`'s plugin fitting `TsdownPluginOption`) may need a cast.

**Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "build: add root vite.config.ts (pack + test projects + lint/fmt)"
```

---

### Task 3: Delete the old vitest config files

**Files:**

- Delete: `vitest.config.ts`, `vitest.ssr.config.ts`, `vitest.shared.ts`, `vitest.coverage.workspace.ts`

**Step 1: Delete the four files**

```bash
git rm vitest.config.ts vitest.ssr.config.ts vitest.shared.ts vitest.coverage.workspace.ts
```

**Step 2: Verify tests run from the root config**

Run: `vp test run`
Expected: both the `client` and `ssr` projects execute. If vitest does not pick up `test.projects` from the root config, fall back to exporting an **array** of `defineConfig` objects (one per project) from `vite.config.ts` — vitest 4 supports an array export as a workspace.

**Step 3: Verify coverage still works**

Run: `vp test run --coverage`
Expected: coverage collected over `src/**`, thresholds satisfied.

**Step 4: Commit**

```bash
git commit -m "build: remove split vitest configs (folded into root vite.config.ts)"
```

---

### Task 4: Verify `vp pack` builds with the Solid plugin

**Files:**

- None (verification + fix task). May touch `vite.config.ts` if the Solid plugin integration needs adjustment.

**Step 1: Run the pack build**

Run: `vp pack`
Expected: `dist/` is produced with `index.<ext>` and a `.d.ts`.

**Step 2: If it fails, diagnose and fix**

Likely failure modes and fixes:

- **`vite-plugin-solid` not accepted by `TsdownPluginOption`**: pass it via `pack.inputOptions` as a function returning `{ plugins: [solid()] }`, or cast. Solid #2618 confirms the plugin is Vite 8 compatible, so the transform itself works.
- **JSX not transformed**: confirm `solid()` is receiving the `.tsx` entry; tsdown passes `.tsx` through loaders by default.
- **dts (tsgo) errors on Solid JSX**: tsgo emits types, not runtime, so `jsx: preserve` should be fine; if tsgo complains, ensure `tsconfig.json` `jsx`/`jsxImportSource` are set (done in Task 1).

**Step 3: Inspect output**

Run: `ls dist/` and open `dist/index.*` + `dist/index.d.ts`
Expected: Solid-reactive output (not raw `jsx` calls), `styles.css` copied, a declaration file present.

**Step 4: Commit any fix**

```bash
git add vite.config.ts
git commit -m "fix(pack): make vite-plugin-solid work under vp pack"
```

(Skip commit if no changes were needed.)

---

### Task 5: Rewrite `package.json` (scripts, exports, devEngines)

**Files:**

- Modify: `package.json`

**Step 1: Replace the `scripts` block**

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

**Step 2: Replace the `exports` block**

Let `vp pack` own the `.` export (do not hand-write it). Keep only the static `styles.css` subpath and the package.json export. After this edit the `.` export will be (re)generated on next `vp pack`; for now:

```jsonc
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  },
  "./styles.css": "./dist/styles.css",
  "./package.json": "./package.json"
}
```

Also remove the now-obsolete `main`, `module`, `browser`, `types`, `typesVersions` fields (auto-managed by `pack.exports`).

**Step 3: Replace `engines` + `packageManager` with `devEngines`**

```jsonc
"devEngines": {
  "packageManager": { "name": "pnpm", "version": "11.5.3", "onFail": "download" }
}
```

Remove the `engines` and `packageManager` keys.

**Step 4: Verify**

Run: `vp pack` then `pnpm exec tsc --noEmit`
Expected: pack rewrites `exports` for `.`; tsc passes.

**Step 5: Commit**

```bash
git add package.json
git commit -m "build: template-align package.json (scripts, exports, devEngines)"
```

---

### Task 6: Run the packed-consumer smoke test

**Files:**

- None (verification). May touch `package.json` exports if the consumer can't resolve.

**Step 1: Run the consumer smoke test**

Run: `pnpm run test:packed-consumer`
Expected: packs velomark, installs in `test-consumer/`, builds, runs `smoke.mjs`, passes.

**Step 2: If resolution fails, fix exports**

If the consumer cannot resolve `velomark` or `velomark/styles.css`, adjust the `exports` `.` conditions (e.g. add a `default` or solid-friendly condition) until the smoke test passes. Keep changes minimal.

**Step 3: Commit any fix**

```bash
git add package.json
git commit -m "fix(exports): resolve packed-consumer import path"
```

(Skip if none needed.)

---

### Task 7: Remove legacy devDependencies

**Files:**

- Modify: `package.json`

**Step 1: Remove these from `devDependencies`**

`@biomejs/biome`, `ultracite`, `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-plugin-eslint-comments`, `eslint-plugin-no-only-tests`, `prettier`, `tsup`, `tsup-preset-solid`, `esbuild`, `esbuild-plugin-solid`, `husky`, `lint-staged`, `concurrently`, `jsdom`.

**Step 2: Add `@typescript/native-preview`** (required by `pack.dts.tsgo`)

Pin to the template's version:

```jsonc
"@typescript/native-preview": "7.0.0-dev.20260509.2"
```

**Step 3: Reinstall**

Run: `vp install`
Expected: lockfile updated, no install errors.

**Step 4: Verify lint still passes without biome/eslint**

Run: `vp check`
Expected: oxlint + oxfmt run (via the `lint`/`fmt` blocks) and pass. Fix any oxlint findings with `vp check --fix` first.

**Step 5: Verify full test/build still passes**

Run: `vp test run && vp pack && pnpm exec tsc --noEmit`
Expected: all green.

**Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: remove biome/ultracite/eslint/prettier/tsup; add tsgo"
```

---

### Task 8: Delete `tsup.config.ts`, `env.d.ts`, and `.agents/`; move `AGENTS.md` to root

**Files:**

- Delete: `tsup.config.ts`, `env.d.ts`, `.agents/` (entire directory — includes the ultracite skill)
- Create: `AGENTS.md` (root)

**Step 1: Delete obsolete files**

```bash
git rm tsup.config.ts env.d.ts
git rm -r .agents
```

**Step 2: Create root `AGENTS.md`** with the template's VITE PLUS block verbatim:

```markdown
<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
```

**Step 3: Verify**

Run: `pnpm exec tsc --noEmit && vp check`
Expected: green. Removing `env.d.ts` is safe — no source reads `ImportMeta.env`.

**Step 4: Commit**

```bash
git add AGENTS.md
git commit -m "chore: remove tsup.config/env.d.ts/.agents; add root AGENTS.md"
```

---

### Task 9: Simplify `pnpm-workspace.yaml`

**Files:**

- Modify: `pnpm-workspace.yaml`

**Step 1: Drop `allowBuilds`** (esbuild is gone)

```yaml
catalog:
  vite: npm:@voidzero-dev/vite-plus-core@latest
  vitest: 4.1.9
  vite-plus: latest
overrides:
  vite: "catalog:"
  vitest: "catalog:"
peerDependencyRules:
  allowAny:
    - vite
    - vitest
  allowedVersions:
    vite: "*"
    vitest: "*"
```

**Step 2: Reinstall and verify**

Run: `vp install && vp check`
Expected: green.

**Step 3: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "build: drop allowBuilds from pnpm-workspace (esbuild removed)"
```

---

### Task 10: Final full-pipeline verification

**Files:** None.

**Step 1: Clean install from scratch**

```bash
rm -rf node_modules dist
vp install
```

**Step 2: Run the complete pipeline**

```bash
vp check && vp test run --coverage && vp pack && pnpm exec tsc --noEmit && pnpm run test:packed-consumer
```

Expected: every command green; coverage thresholds met.

**Step 3: Confirm no legacy references remain**

Run: `rg -i "biome|ultracite|tsup|eslint|prettier|husky|lint-staged" --glob '!docs/plans/*' --glob '!pnpm-lock.yaml'`
Expected: no matches in source/config (lockfile may still contain transitive entries; that's fine).

**Step 4: Inspect final dist**

Run: `ls dist/`
Expected: `index.*`, `index.d.ts`, `styles.css` — no `dev.js`, no stale chunks.

**Step 5: Commit** (only if verification surfaced fixes)

```bash
git add -A
git commit -m "build: finalize vite-plus template migration"
```

---

## Definition of Done

- `vp install`, `vp check`, `vp test`, `vp pack`, `pnpm exec tsc --noEmit`, and `pnpm run test:packed-consumer` all pass.
- No `biome`, `ultracite`, `tsup`, `eslint`, `prettier`, `husky`, or `lint-staged` in `package.json` or source.
- Repo file layout matches the template: root `vite.config.ts` + `AGENTS.md`, no `vitest.*.ts`, no `tsup.config.ts`, no `env.d.ts`.
