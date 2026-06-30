# Phase 1 — `packages/core` (standalone engine + plugin contract)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stand up `packages/core` as a self-contained Solid markdown engine that renders structure (paragraphs, headings, lists, tables, blockquotes, code-as-plain, math-as-plain, directives, footnotes, theme) with NO hard dependency on the feature modules — feature capabilities (Shiki, KaTeX, Mermaid) are injected via a typed `PluginConfig` contract.

**Architecture:** COPY `src/core/**` into `packages/core/src/**` (leave `src/` 100% untouched as the comparison reference). Then, in the copy only, sever the three feature imports (`../../../code`, `../../../math`, `../../../mermaid`) by routing render components through a Solid `PluginContext`. When no plugin is registered, components render a graceful plain fallback. The contract types are shiki/katex/mermaid-agnostic so core carries no heavy deps.

**Tech Stack:** SolidJS (`createContext`/`useContext`), TypeScript, Vite+ (`vp check` / `vp run -r test`). No `unified`. No shiki/katex/mermaid in core.

**Coexistence rule:** `src/` stays the green, published reference. `packages/core` is built alongside. Both must stay green independently. Diff `packages/core/src` vs `src/core` to review the contract refactor.

**Testing model (per [Vite+ monorepo guide](https://viteplus.dev/guide/monorepo)):** each package owns its `test` block in its `vite.config.ts`, composed from a shared `tooling/solid-test.ts` helper (`solidTest({ client, ssr? })`). The root `vite.config.ts` does NOT glob into `packages/**`. Commands:

- All tests: `vp run -r test` (alias `npm run test:all`)
- One package: `vp run --filter ./packages/core test`
- Root only: `vp test`

---

## Contract design (shiki/katex/mermaid-agnostic)

Core defines the **interfaces**; the feature packages (Phase 3–6) supply the **implementations**.

- `CodeHighlighterPlugin` — `highlight(opts, cb?) → HighlightResult | null` (tokens), `supportsLanguage`, `getThemes`. Pure capability object. Core renders the returned tokens.
- `MathRendererPlugin` — `render(tex, displayMode) → { html } | null`. Returns KaTeX HTML string; core injects via `innerHTML`.
- `DiagramPlugin` — `getMermaid(config?) → MermaidInstance` (`render(id, source) → Promise<{svg}>`), `language: "mermaid"`.
- `CustomRenderer` — `{ component: Component<CustomRendererProps>, language: string | string[] }` (Solid, not React).
- `PluginConfig` — `{ code?, math?, mermaid?, cjk?, renderers? }`.

> **Why generic types:** streamdown's `plugin-types.ts` imports `BundledLanguage`/`MermaidConfig` directly. We deliberately use `string`/`unknown` so core has zero type-coupling to shiki/mermaid. `@velomark/code` narrows `language: BundledLanguage` at its end.

---

## Task 1: Plugin contract types

**Files:**

- Create: `packages/core/src/plugins/types.ts`

**Step 1: Create the contract types**

```ts
import type { Component } from "solid-js";

export interface HighlightToken {
  bgColor?: string;
  color?: string;
  content: string;
  htmlAttrs?: Record<string, string>;
  htmlStyle?: Record<string, string>;
  offset?: number;
}

export interface HighlightResult {
  bg?: string;
  fg?: string;
  rootStyle?: string | false;
  tokens: HighlightToken[][];
}

export interface HighlightOptions {
  code: string;
  language: string;
  themes: [unknown, unknown];
}

export interface CodeHighlighterPlugin {
  getSupportedLanguages: () => string[];
  getThemes: () => [unknown, unknown];
  highlight: (
    options: HighlightOptions,
    callback?: (result: HighlightResult) => void,
  ) => HighlightResult | null;
  name: "shiki";
  supportsLanguage: (language: string) => boolean;
  type: "code-highlighter";
}

export interface MermaidInstance {
  initialize: (config: unknown) => void;
  render: (id: string, source: string) => Promise<{ svg: string }>;
}

export interface DiagramPlugin {
  getMermaid: (config?: unknown) => MermaidInstance;
  language: string;
  name: "mermaid";
  type: "diagram";
}

export interface MathRenderResult {
  html: string;
}

export interface MathRendererPlugin {
  getStyles?: () => string;
  name: "katex";
  render: (tex: string, displayMode: boolean) => MathRenderResult | null;
  type: "math";
}

export interface CjkPlugin {
  name: "cjk";
  postPass?: (text: string) => string;
  prePass?: (input: string) => string;
  type: "cjk";
}

export interface CustomRendererProps {
  code: string;
  isIncomplete: boolean;
  language: string;
  meta?: string;
}

export interface CustomRenderer {
  component: Component<CustomRendererProps>;
  language: string | string[];
}

export interface PluginConfig {
  cjk?: CjkPlugin;
  code?: CodeHighlighterPlugin;
  math?: MathRendererPlugin;
  mermaid?: DiagramPlugin;
  renderers?: CustomRenderer[];
}
```

**Step 2: Verify** — Run: `vp check` · Expected: PASS (new file, no imports yet).

**Step 3: Commit** — `feat(core): add plugin contract types`

---

## Task 2: Plugin context (Solid)

**Files:**

- Create: `packages/core/src/plugins/plugin-context.tsx`

**Step 1: Create the context + hooks**

```tsx
import { createContext, useContext, type JSX } from "solid-js";
import type { PluginConfig } from "./types";

const PluginContext = createContext<PluginConfig>({});

export function PluginProvider(props: { children: JSX.Element; config: PluginConfig }) {
  return <PluginContext.Provider value={props.config}>{props.children}</PluginContext.Provider>;
}

export function usePlugins(): PluginConfig {
  return useContext(PluginContext);
}
```

**Step 2: Verify** — Run: `vp check` · Expected: PASS.

**Step 3: Commit** — `feat(core): add PluginProvider context`

---

## Task 3: Copy the engine (`src/core/**` → `packages/core/src/**`)

> Pure copy. Do NOT edit `src/`. The copied tree will NOT typecheck yet (it still imports `../../../code`, `../../../math`, `../../../mermaid` which don't exist under `packages/`) — that's expected; Tasks 4–5 fix it.

**Files:**

- Copy: every file under `src/core/` → `packages/core/src/`, preserving structure:
  - `src/core/types.ts` → `packages/core/src/types.ts`
  - `src/core/theme/**` → `packages/core/src/theme/**`
  - `src/core/model/**` → `packages/core/src/model/**`
  - `src/core/parser/**` → `packages/core/src/parser/**`
  - `src/core/patch/**` → `packages/core/src/patch/**`
  - `src/core/render/**` → `packages/core/src/render/**` (including `__tests__/`, `blocks/`, `inline/`, `footnotes/`, `directives/`)

**Step 1: Copy the tree**

```bash
cp -R src/core/theme packages/core/src/theme
cp -R src/core/model packages/core/src/model
cp -R src/core/parser packages/core/src/parser
cp -R src/core/patch packages/core/src/patch
cp -R src/core/render packages/core/src/render
cp src/core/types.ts packages/core/src/types.ts
```

**Step 2: Delete the stale smoke stub** — `rm packages/core/src/index.tsx` (the `VELOMARK_VERSION` stub from Phase 0; replaced by the real public API in Task 6).

**Step 3: Verify** — Run: `vp check` · Expected: **FAIL** — the copied `render/blocks/code-block.tsx`, `render/blocks/math-block.tsx`, `render/inline/inline-token-view.tsx` reference `../../../code`, `../../../math`, `../../../mermaid` which don't resolve under `packages/`. This confirms the three severance points. (All other copied files should be clean.)

**Step 4: Commit** — `chore(core): copy engine from src/core into packages/core (not yet decoupled)`

---

## Task 4: Add a core-local highlight token renderer

> Core must render `HighlightResult` tokens itself (the plugin only produces tokens). Copy the token→span logic out of `src/code/highlighted-code-block.tsx` into core so core is self-sufficient when a `code` plugin is registered.

**Files:**

- Create: `packages/core/src/render/code/highlighted-tokens.tsx`
- Reference: `src/code/highlighted-code-block.tsx` (the `HighlightToken` → `<span style=...>` mapping; the `<pre>/<code>` shell; NOT the Shiki manager).

**Step 1: Extract token rendering**

Create `highlighted-tokens.tsx` exporting a `HighlightedTokens` component that takes `{ result: HighlightResult }` and renders `<For each={result.tokens}>` → lines → `<span>`s using each token's `color`/`bgColor`/`htmlStyle` as inline `style`. Set the root `pre`/`code` `style` from `result.bg`/`result.fg`/`result.rootStyle`. Lift this from `src/code/highlighted-code-block.tsx`. Keep `data-velomark-code-highlighted` on the `<code>`.

**Step 2: Verify** — Run: `vp check` · Expected: PASS (new self-contained file).

**Step 3: Commit** — `feat(core): add core-local highlight token renderer`

---

## Task 5: Sever the three feature imports (decouple render)

> This is the heart of Phase 1. Replace the three feature imports with `usePlugins()`, with plain fallbacks when no plugin is registered.

**Files (all in `packages/core/src/`, the COPY):**

- Modify: `packages/core/src/render/blocks/code-block.tsx`
- Modify: `packages/core/src/render/blocks/math-block.tsx`
- Modify: `packages/core/src/render/inline/inline-token-view.tsx`

### Step 1: `code-block.tsx` — drop `../../../code` + `../../../mermaid`

- Remove `import { ... } from "../../../code"` and `import { MermaidBlock } from "../../../mermaid"`.
- Add `import { usePlugins } from "../../plugins/plugin-context"` and `import { HighlightedTokens } from "../code/highlighted-tokens"`.
- `const plugins = usePlugins();`
- **Mermaid branch:** if `block.data.language === plugins.mermaid?.language` AND `plugins.mermaid` exists → render an async SVG container (call `plugins.mermaid.getMermaid().render(id, source)` → `innerHTML`). Until Phase 4 wires a real plugin, this branch is dormant.
- **Highlighted branch:** else if `plugins.code?.supportsLanguage(lang)` → call `plugins.code.highlight({...})`; render `<HighlightedTokens result={...} />` inside the shell.
- **Fallback:** else → plain `<pre><code>{source}</code></pre>` (no highlighting). Keep `data-velomark-block-kind="code"`, `data-velomark-language`, copy button + language badge shell structure from the original.

### Step 2: `math-block.tsx` — drop `../../../math`

- Remove `import { MathView } from "../../../math"`.
- `const plugins = usePlugins();`
- If `plugins.math` → `const out = plugins.math.render(tex, true)` → render `<div data-velomark-math-rendered innerHTML={out.html} />`.
- Else → plain fallback `<pre><code>{tex}</code></pre>` (keep `data-velomark-block-kind="math"`).

### Step 3: `inline-token-view.tsx` — drop `../../../math` (inline math case)

- Remove `import { MathView } from "../../../math"`.
- For the `inline-math` token case: if `plugins.math` → `innerHTML` from `plugins.math.render(value, false)`; else → render the raw `value` text.

### Step 4: Update copied tests that asserted feature output

- `packages/core/src/render/__tests__/render-blocks.test.tsx` — code-block tests that previously asserted Shiki token spans (`[data-velomark-code-highlighted]`) now assert the **plain fallback** (no plugin registered in core tests). Keep `[data-velomark-block-kind="code"]`, `[data-velomark-code-language]`, copy-button assertions. Remove/adjust highlighting-only assertions and note them as "re-enabled in Phase 3 when a code plugin is registered in tests."

### Step 5: Verify

Run: `vp check` · Expected: PASS (no more `../../../code|math|mermaid` imports anywhere under `packages/core/src`).
Run: `vp run -r test` · Expected: PASS — `src/` tests untouched (green); `packages/core` tests green with fallback behavior.

Confirm the severance: `rg "from ['\"](\.\./)*(code|math|mermaid)/" packages/core/src` → **no matches**.

**Step 6: Commit** — `refactor(core): decouple render from feature modules via PluginContext`

---

## Task 6: Wire `<Velomark>` to accept `plugins` + provide context; public API

**Files:**

- Modify: `packages/core/src/render/velomark.tsx`
- Modify: `packages/core/src/render/render-block.tsx` (if it still prop-drills feature concerns — it shouldn't need changes since plugins come via context; verify)
- Overwrite: `packages/core/src/index.tsx` (public API)

### Step 1: Add `plugins` prop to `VelomarkProps`

In `velomark.tsx`, add to `VelomarkProps`:

```ts
import type { PluginConfig } from "../plugins/types";
// ...
plugins?: PluginConfig;
```

### Step 2: Wrap render tree in `PluginProvider`

```tsx
import { PluginProvider } from "../plugins/plugin-context";

return (
	<PluginProvider config={props.plugins ?? {}}>
		<div class={...} data-velomark-root="" style={themeStyle()}>
			{/* existing <For> + <FootnotesSection> */}
		</div>
	</PluginProvider>
);
```

### Step 3: Public API — overwrite `packages/core/src/index.tsx`

Mirror `src/index.tsx` exactly, PLUS export the plugin contract:

```ts
export { parseInline } from "./core/parser/inline-parser"; // NOTE: paths now relative to packages/core/src — see Step 4
export type { VelomarkProps } from "./render/velomark";
export { Velomark } from "./render/velomark";
export { applyTheme, resolveTheme } from "./theme/apply-theme";
export { generateCssVars } from "./theme/generate-css-vars";
export type { PartialVelomarkTheme } from "./theme/merge-theme";
export { mergeTheme } from "./theme/merge-theme";
export {
  darkTheme,
  defaultTheme,
  velomarkColors,
  velomarkThemePresets,
  velomarkTokens,
} from "./theme/tokens";
export type { VelomarkTheme, VelomarkThemeName } from "./theme/types";
export type {
  InlineToken,
  RenderBlock,
  RenderDocument,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
} from "./types";
// NEW — plugin contract:
export type {
  PluginConfig,
  CodeHighlighterPlugin,
  MathRendererPlugin,
  DiagramPlugin,
  CjkPlugin,
  CustomRenderer,
  CustomRendererProps,
  HighlightResult,
  HighlightToken,
} from "./plugins/types";
export { PluginProvider, usePlugins } from "./plugins/plugin-context";
```

### Step 4: Fix import depth

The copied files kept `src/core`-depth relative imports (e.g. `./core/parser/...`, `../theme/...`). Since `packages/core/src/` IS the old `src/core/` level, the internal relative imports (`../theme/...`, `./blocks/...`) are already correct. But `src/index.tsx` used `./core/parser/...` — in `packages/core/src/index.tsx` that becomes `./parser/...`. Adjust any `./core/`-prefixed imports in `index.tsx` to drop the `core/` segment. Grep to confirm: `rg "from ['\"]\.(/core|\.\.\/core)" packages/core/src` → no matches expected after fix.

### Step 5: Verify

Run: `vp check` · Expected: PASS.
Run: `vp run -r test` · Expected: PASS (both `src/` and `packages/core` green).

**Step 6: Commit** — `feat(core): expose plugins prop + public API with plugin contract`

---

## Task 7: Wire the `dev/` playground to import from `packages/core` (optional comparison mode)

> Optional but recommended: add a toggle so you can render the SAME fixture through `src/` (old) and `packages/core` (new) side-by-side. This is the "compare before/after as a whole" the duplication enables.

**Files:**

- Modify: `dev/components/renderer-panel.tsx` — import `Velomark` from `packages/core` (via workspace name `velomark`) behind a flag, OR add a second panel.

**Step 1:** Add `velomark` (the workspace package) as a dep in the dev consumer and render `<Velomark markdown={...} />` from `packages/core` next to the existing `src/`-based render.

**Step 2:** Run `vp dev dev`, confirm both render. The `packages/core` version shows plain code/math (no plugins registered) — that's the expected Phase 1 state.

**Step 3: Commit** — `chore(dev): add packages/core comparison render`

---

## Task 8: Verify gates + update tracker

**Step 1:** Run `vp check` · Expected: clean across all files (`src/` + `packages/`).
**Step 2:** Run `vp run -r test` · Expected: `src/` suite green (untouched); `packages/core` suite green.
**Step 3:** Confirm severance: `rg "from ['\"](\.\./)*(code|math|mermaid)/" packages/core/src` → no matches.
**Step 4:** Confirm `src/` is byte-identical to before Phase 1: `git diff src/` → empty.
**Step 5:** Update `docs/plans/2026-07-01-monorepo-port.md` Phase 1 checkboxes.
**Step 6: Commit** — `docs: mark Phase 1 complete`

---

## Out of scope (deferred)

- **Styling port** (streamdown Tailwind classes + `@theme` bridge) — apply to `packages/core` components in a follow-up; the existing `docs/plans/2026-07-01-styling-tailwind-port.md` still applies (paths remapped to `packages/core/src/`).
- **Registering real plugins** (Shiki/KaTeX/Mermaid) — Phases 3–6.
- **`remend` / `cjk`** — Phases 2 / 6.
- **Benchmark harness** — Phase 7.
