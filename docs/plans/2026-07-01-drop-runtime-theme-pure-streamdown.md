# Drop Runtime Theme — Pure Streamdown Theming

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove velomark's runtime theme system (`theme` prop, `VelomarkTheme` object, `resolveTheme`/`generateCssVars`/`mergeTheme`) from `packages/core` and adopt streamdown's model: components use shadcn utilities that resolve against the consumer's `:root`/`.dark` tokens; dark mode via `.dark` class only.

**Architecture:** The `theme` prop is threaded through 5 render components but has **zero `theme.*` property reads** in the render layer — styling already runs on CSS utilities. So the change is prop/import removal + relocating `styles.css`, not style-logic rewriting. Streamdown ships no colors; the consumer brings the shadcn theme. The `dev` playground (already toggles `.dark` on `<html>`) gets a shadcn token block mirroring streamdown's website (`geistdocs.css`).

**Tech Stack:** SolidJS, Tailwind v4 (`@theme inline` + `:root`/`.dark`), `cnfast`, Vite+ (`vp check`/`vp test`/`vp build`).

**Scope:** `packages/core` + the `dev` playground that consumes it. The legacy `src/` reference tree is OUT OF SCOPE (untouched until Phase 7 cutover).

---

## Surface (verified)

Render-layer `theme` references (all prop-threading, no reads):

- `packages/core/src/render/velomark.tsx:7-10,30,42,71-72,96,109,119` — prop + `resolveTheme`/`generateCssVars` + inline `style` + threading
- `packages/core/src/render/render-block.tsx:15,43,94,106` — import + prop + thread to CodeBlockView/ContainerBlock
- `packages/core/src/render/blocks/container-block.tsx:4,36,51` — import + prop + thread
- `packages/core/src/render/blocks/code-block.tsx:6,21` — import + prop (UNUSED in body)
- `packages/core/src/render/footnotes/footnotes-section.tsx:4,19,46` — import + prop + thread

Public API: `packages/core/src/index.tsx:4-15` — exports `applyTheme`, `resolveTheme`, `generateCssVars`, `mergeTheme`, `PartialVelomarkTheme`, `darkTheme`, `defaultTheme`, `velomarkColors`, `velomarkThemePresets`, `velomarkTokens`, `VelomarkTheme`, `VelomarkThemeName`.

Delete: entire `packages/core/src/theme/` dir (8 files + `__tests__` + `styles.css`).

Dev playground:

- `dev/components/renderer-panel.tsx:3,9,32` — `VelomarkThemeName` import + prop + `theme={...}`
- `dev/app.tsx:162` — `theme={theme() === "dark" ? ...}` on RendererPanel (line 142 `theme={theme()}` on WorkbenchControlsPanel STAYS — playground UI state)
- `dev/main.css` — import path + needs shadcn token block
- `dev/__tests__/theme.test.tsx` — STALE (imports legacy `src/core/theme`, asserts dead desktop paths). Rewrite to new contract.

Shadcn utilities velomark uses (must be covered by dev token block): `bg-background`, `bg-muted`, `bg-sidebar`, `border-border`, `border-muted`, `border-sidebar`, `divide-border`, `text-foreground`, `text-muted`, `text-primary`, `font-mono`.

---

### Task 1: Establish baseline

Run: `vp test --filter ./packages/core test` and `vp test` (root).
Record pass/fail counts. Expected: `packages/core` 106 pass / 1 pre-existing fail (streaming-edge); dev theme test likely already failing (stale).

---

### Task 2: Strip `theme` from render layer

**Files:** all 5 render files listed above.

For each: remove the `VelomarkTheme` import line, the `theme: VelomarkTheme` prop, and every `theme={...}` thread. In `velomark.tsx` additionally remove `resolveTheme`/`generateCssVars`/`PartialVelomarkTheme` imports, the `resolvedTheme`/`themeStyle` memos, and `style={themeStyle()}` on the root `<div>`.

Verify typechecks locally before moving on.

---

### Task 3: Delete `packages/core/src/theme/` + drop public exports

Delete the entire `packages/core/src/theme/` directory.
Edit `packages/core/src/index.tsx`: remove lines 4-15 (all theme exports).

---

### Task 4: Relocate + strip `styles.css` to pure-streamdown

Move `packages/core/src/theme/styles.css` → `packages/core/styles.css`.
Strip the `.velomark { --velomark-* … }` default block AND the `@theme { … }` bridge (ship no colors). Keep:

- `@import "katex/dist/katex.min.css";`
- `@source "./src/render";` (path adjusted from `../render` to `./src/render` for new root location)

Edit `packages/core/package.json`: add `"./styles.css": "./styles.css"` to `exports`, add `"files": ["dist", "styles.css"]`.

---

### Task 5: Rewire dev playground to class-based dark mode

`dev/components/renderer-panel.tsx`: drop `VelomarkThemeName` from the import, drop `theme` prop, drop `theme={props.theme}` on `<Velomark>`.
`dev/app.tsx:162`: drop the `theme={...}` prop on `<RendererPanel>` (keep line 142 on WorkbenchControlsPanel).
`dev/main.css`: change import to `@import "../packages/core/styles.css";` and add a shadcn token block modeled on streamdown's `geistdocs.css` — `@custom-variant dark`, `@theme inline { --color-* → var(--*) }`, `:root { --background … }`, `.dark { --background … }` covering all utilities velomark uses.

---

### Task 6: Rewrite stale dev theme test

`dev/__tests__/theme.test.tsx`: remove legacy `src/core/theme` import and dead-path assertions. New contract assertions:

- `<html>` gets `.dark` on default mount (dark is default playground theme)
- `[data-velomark-root]` has NO inline `--velomark-*` style (theming is CSS-driven now)
- Light/Dark buttons toggle `.dark` on `<html>` + persist to localStorage

---

### Task 7: Verify + commit

Run: `vp check`, `vp test` (root, all globs), `vp build dev`, `vp dev dev` (smoke — HTTP 200).
Commit plan doc + all changes together: `refactor(core): drop runtime theme, adopt streamdown class-based theming`.

---

## Out of scope / deferred

- Legacy `src/core/theme/` (reference tree) — untouched.
- Published `dist/styles.css` consumer `@source` path — deferred to Phase 7 cutover (dev imports source directly).
- `packages/core/vite.config.ts` `copy` for styles.css — deferred (workspace consumes source; `files` field is forward-looking).
