# Velomark Tailwind Styling Port — Implementation Plan

> **For Claude:** Detailed porting plan. Verify with `vp check && vp test` after each task. Commit per task. Run `vp dev` for visual check after Tasks 2–9.

**Goal:** Replace velomark's plain-CSS component styling (`src/core/theme/styles.css` element/attribute selectors) with Tailwind v4 utility classes inline in components (`class={cn(...)}`), matching streamdown's distribution model — while **keeping velomark's `VelomarkTheme` token system as source of truth** via a Tailwind `@theme` bridge.

**Architecture:** A three-layer design:

1. **Tokens (unchanged public contract):** `VelomarkTheme` → `generateCssVars` → 40 `--velomark-*` vars, applied per-instance as inline `style` on the root `.velomark` div (as today).
2. **`@theme` bridge (NEW):** velomark's shipped `styles.css` registers Tailwind utility color/radius/font keys that alias the `--velomark-*` vars — so `bg-background`, `text-foreground`, `border-border`, etc. resolve to velomark's tokens. Self-contained: consumers do NOT need shadcn tokens.
3. **Utility classes in components (NEW):** each renderer uses `class={cn("...")}` with literal class strings (ported from streamdown's inventory) + the caller's `class` prop. The existing `data-velomark-*` attributes stay (test contract + styling hooks).

**Tech Stack:** SolidJS, Tailwind v4 (peer dep), `clsx` + `tailwind-merge` (runtime deps), `cn` helper, Vitest, vite-plus.

**Consumer contract change (deliberate):** consumers must (a) use Tailwind v4, (b) add `@source "../node_modules/velomark/dist/*.js";`, (c) `import "velomark/styles.css";`. Documented in Task 15.

**Reference (read before starting):**

- Streamdown per-element class inventory: `docs/references/streamdown/packages/streamdown/lib/components.tsx`, `lib/code-block/*`, `lib/table/*`, `lib/image.tsx`, `lib/utils.ts`.
- Velomark current CSS: `src/core/theme/styles.css` (the file being replaced).

**Conventions for every task:**

- KEEP all `data-velomark-*` attributes verbatim — tests + downstream rely on them.
- KEEP the `--velomark-*` public var names (`generateCssVars` output is a public contract).
- Use Solid's `class=` (not `className`). Compose with `cn(...)`.
- Shiki token inline `style` stays (dynamic per-token colors — `highlighted-code-block.tsx`).
- `vp check && vp test` green; commit.

---

## Design reference: the `@theme` token bridge

This single block (lands in Task 1, lives in `src/core/theme/styles.css`) is the keystone. It maps Tailwind utility keys → velomark tokens. Streamdown-equivalent names align with streamdown's class strings; velomark-specific names cover velomark's richer surfaces.

```css
@theme {
  /* shadcn-compatible (what streamdown utilities expect) */
  --color-background: var(--velomark-color-surface-base);
  --color-foreground: var(--velomark-color-text-primary);
  --color-muted: var(--velomark-color-surface-elevated);
  --color-muted-foreground: var(--velomark-color-text-muted);
  --color-primary: var(--velomark-color-text-accent);
  --color-primary-foreground: var(--velomark-color-text-inverse);
  --color-border: var(--velomark-color-border-default);
  --color-sidebar: var(--velomark-color-surface-elevated); /* load-bearing for code/table/mermaid */
  --radius: var(--velomark-radius-md);

  /* radius scale (lets us use rounded-sm/md/lg) */
  --radius-sm: var(--velomark-radius-sm);
  --radius-md: var(--velomark-radius-md);
  --radius-lg: var(--velomark-radius-lg);

  /* fonts (font-sans / font-mono utilities) */
  --font-sans: var(--velomark-typography-body-font);
  --font-mono: var(--velomark-typography-mono-font);

  /* shadow (shadow-xs/sm) */
  --shadow-xs: var(--velomark-shadow-xs);
  --shadow-sm: var(--velomark-shadow-sm);
}
```

> **No velomark-specific utility aliases.** Components use streamdown's exact class strings, which reference only the shadcn names above (`bg-muted`, `bg-sidebar`, `bg-background`, `text-foreground`, `text-muted-foreground`, `text-primary`, `border-border`). Don't invent `bg-code` / `bg-math` / `text-link` etc. — streamdown's design is the target and only needs the shadcn subset. The velomark-specific theme leaves (`surface.code`, `surface.math`, `surface.quote`, `link.*`, `code.*`, etc.) become **dormant** (still emitted by `generateCssVars`, still in the type) — see "Follow-up: slim VelomarkTheme" after Task 16.

---

## Task 1: Foundation — deps, `cn`, context, `@theme` bridge, `styles.css` skeleton

**Files:**

- Modify: `package.json` (deps), `src/core/theme/styles.css` (rewrite), `src/core/theme/__tests__/theme.test.ts:236-248` (styles.css content assertions)
- Create: `src/core/theme/cn.ts`, `src/core/theme/cn-context.tsx`, `src/core/theme/__tests__/cn.test.ts`

**Step 1 — deps.** In `package.json`: add `clsx` (`^2.1.1`) and `tailwind-merge` (`^3.4.0`) to `dependencies`; move `tailwindcss` to `peerDependencies` (keep in `devDependencies`). Run `vp install`.

**Step 2 — `cn` helper.** Create `src/core/theme/cn.ts` (framework-agnostic, ported from streamdown `lib/utils.ts:1-6`):

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
export type CnFunction = (...inputs: ClassValue[]) => string;
```

**Step 3 — Solid `CnContext`.** Create `src/core/theme/cn-context.tsx`:

```tsx
import { createContext, useContext, type ParentComponent } from "solid-js";
import { cn, type CnFunction } from "./cn";

export const CnContext = createContext<CnFunction>(cn);
export const useCn = (): CnFunction => useContext(CnContext);
export const CnProvider: ParentComponent<{ value: CnFunction }> = (props) => (
  <CnContext.Provider value={props.value}>{props.children}</CnContext.Provider>
);
```

**Step 4 — `@theme` bridge + `styles.css` rewrite.** Replace the entire `src/core/theme/styles.css` with:

```css
@import "katex/dist/katex.min.css";

@theme {
  /* …the full block from "Design reference" above… */
}

/* Per-instance tokens still applied as inline style on .velomark root by velomark.tsx.
   No component selectors remain here — all styling moves to utility classes. */
```

Remove every `.velomark …` rule (lines 3–227 of the old file). Keep ONLY the `@import` + `@theme` block now; keyframes are added in Task 14.

**Step 5 — provide `cn` from root.** In `src/core/render/velomark.tsx`: create the prefix-less `cn` once (memo on future `prefix` prop — wiring in Task 13), wrap the returned JSX in `<CnProvider value={cn}>`. (For now `cn` is the plain helper; Task 13 adds prefix.)

**Step 6 — update tests.**

- Update `src/core/theme/__tests__/theme.test.ts:236-248`: the file is still at `src/core/theme/styles.css`; required strings `.velomark` is now ABSENT (root class still emitted by the component, not the CSS) — change assertions to require `@theme`, `--color-background: var(--velomark-color-surface-base)`, `--color-sidebar`, `@import "katex/dist/katex.min.css"`; forbidden strings unchanged (no `--velomark-color-text:` bare, etc.). Also assert `--velomark-*` vars are NO LONGER defined in styles.css (they're applied inline by the component) — update accordingly.
- Create `src/core/theme/__tests__/cn.test.ts`: `cn("a b", false && "c", "d")` → `"a b d"`; merge conflict `cn("p-2 p-4")` → `"p-4"`.

**Verify:** `vp check && vp test`. **Commit:** `refactor(theme): add cn helper, @theme token bridge, strip component CSS`.

> After this task the rendered output is UNSTYLED (components still set no classes). Tasks 2–12 add the classes element-by-element; run `vp dev` between them to watch styling return.

---

## Task 2: Root wrapper + paragraph + inline text

**Files:** `src/core/render/velomark.tsx`, `src/core/render/blocks/paragraph-block.tsx`, `src/core/render/inline/inline-token-view.tsx`

Port from streamdown: wrapper `index.tsx:766-770`, `MemoStrong` `components.tsx:249`, `MemoSup/Sub` `:614/:633`, `MemoCode` (inline) `:805-808`, `MemoHr` `:233`, anchor `:318-343`.

**Steps:**

- **Root `.velomark` div** (`velomark.tsx:84-89`): add `class={cn("velomark space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", props.class)}`. Keep `data-velomark-root`, keep `style={themeStyle()}`. Note: `.velomark` is now just a marker class (no CSS rule needed), but keep it for consumer targeting.
- **Paragraph** (`paragraph-block.tsx`): streamdown adds NO classes to `<p>` — leave bare (keep `data-velomark-*`).
- **`strong`** (`inline-token-view.tsx` ~line 88): `class={cn("font-semibold")}`.
- **`em` / `del`**: streamdown styles neither (native) — leave bare. (Decision: keep native; matches streamdown.)
- **`sup` / `sub`** (footnote ref / sub): `class={cn("text-sm")}`.
- **Inline `code`** (`:86`): `class={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-sm")}` (streamdown `components.tsx:805-808`, verbatim).
- **Anchor** (`:113-120`): `class={cn("font-medium text-primary underline wrap-anywhere")}`. Keep `target="_blank" rel="noopener noreferrer"`.
- **`hr`** (`thematic-break-block.tsx`): `class={cn("my-6 border-border")}`.

**Tests:** existing `render-blocks.test.tsx` assertions (structure/attrs) must still pass — no new tests needed; optionally add a class-presence assertion for `strong.font-semibold`.

**Verify:** `vp check && vp test`; `vp dev` (headings/text/links render styled). **Commit.**

---

## Task 3: Headings

**Files:** `src/core/render/blocks/heading-block.tsx`

Port from streamdown `components.tsx:371-456`: pattern `mt-6 mb-2 font-semibold text-<size>` where size = `3xl,2xl,xl,lg,base,sm` for h1–h6.

**Steps:** Add per-depth class via a lookup map keyed on `data-velomark-heading-depth`:

```ts
const HEADING_CLASSES: Record<string, string> = {
  "1": "mt-6 mb-2 font-semibold text-3xl",
  "2": "mt-6 mb-2 font-semibold text-2xl",
  "3": "mt-6 mb-2 font-semibold text-xl",
  "4": "mt-6 mb-2 font-semibold text-lg",
  "5": "mt-6 mb-2 font-semibold text-base",
  "6": "mt-6 mb-2 font-semibold text-sm",
};
```

Apply `class={cn(HEADING_CLASSES[depth])}` on each `<hN>`. Keep all `data-velomark-*`.

**Verify/Commit.**

---

## Task 4: Blockquote

**Files:** `src/core/render/blocks/blockquote-block.tsx`

Port from streamdown `components.tsx:593-596`: `my-4 border-muted-foreground/30 border-l-4 pl-4 italic`.

**Steps:** Use streamdown's exact class string verbatim (`components.tsx:593-596`):

```ts
class={cn("my-4 border-l-4 border-muted-foreground/30 pl-4 text-muted-foreground italic")}
```

**Verify/Commit.**

---

## Task 5: Lists (ul/ol/li + task items)

**Files:** `src/core/render/blocks/list-block.tsx`

Port from streamdown `components.tsx:172-215`: `MemoOl` `list-inside list-decimal whitespace-normal [li_&]:pl-6`; `MemoUl` `… list-disc …`; `MemoLi` `py-1 [&>p]:inline`.

**Steps:**

- `<ol>`: `class={cn("list-inside list-decimal whitespace-normal [li_&]:pl-6")}`.
- `<ul>`: `class={cn("list-inside list-disc whitespace-normal [li_&]:pl-6")}`.
- `<li>`: `class={cn("py-1 [&>p]:inline")}`.
- Task-list `<input type=checkbox>`: streamdown leaves native — but velomark currently disables it. Add `class={cn("mr-1 align-middle")}` for tidy alignment (keep `disabled`). Optional; native is acceptable for parity.

**Verify/Commit.**

---

## Task 6: Code block (shell, body, copy button, language badge)

**Files:** `src/code/default-code-block-shell.tsx`, `src/core/render/blocks/code-block.tsx`, `src/code/highlighted-code-block.tsx`

Port from streamdown `lib/code-block/container.tsx:20-23`, `body.tsx:86-107`, `copy-button.tsx:70-73`, plus `components.tsx` inline-code split.

> **Scope (styling-only):** this task keeps velomark's existing code-block LAYOUT (no header bar; absolute copy button + absolute language badge) and only swaps the colors/spacing to streamdown's shadcn-based classes. Full structural parity (streamdown's `CodeBlockContainer` + header + sticky actions pill + body — see `lib/code-block/`) is a **separate optional task**; doing it would also require updating the tests at `render-blocks.test.tsx:129-147` that currently assert `[data-velomark-code-header]` is null.

**Steps:**

- **Shell `<div>`** (`code-block.tsx:53-59`): `class={cn("relative my-4 w-full rounded-xl border border-border bg-sidebar p-2 text-sm")}` (streamdown container colors; `bg-sidebar` is load-bearing). Keep `data-velomark-block-kind="code"`, `data-velomark-language`.
- **Copy button** (`default-code-block-shell.tsx:76-86`): keep velomark's absolute circle layout, apply streamdown's control-button colors:
  ```ts
  class={cn(
    "absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-all hover:bg-muted hover:text-foreground active:translate-y-px",
    copied() && "text-primary",
  )}
  ```
  Keep `data-velomark-code-copy`, `data-velomark-code-copy-state`, `aria-label`.
- **Language badge** (`:89-92`): `class={cn("absolute bottom-2 right-2 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs lowercase text-muted-foreground")}`. Keep `data-velomark-code-language`.
- **`<pre>`** (`highlighted-code-block.tsx`): `class={cn("overflow-x-auto rounded-md border border-border bg-background p-4 text-sm")}` (streamdown `body.tsx:86-89`).
- **`<code>` inside pre**: keep `data-velomark-code-highlighted`. Leave Shiki token `<span style={...}>` UNCHANGED (dynamic colors).

**Tests:** `render-blocks.test.tsx:129-202` (copy button present/state cycle, language badge, highlighted spans) must still pass. **Verify/Commit.**

---

## Task 7: Tables

**Files:** `src/core/render/blocks/table-block.tsx`

Port from streamdown `lib/table/index.tsx:31-56` + `components.tsx:500-575`.

> **Velomark difference (preserve):** no copy/download/fullscreen controls yet (those land in main-plan Task 5). Just the table styling.

**Steps:**

- **Wrapper `<div data-velomark-table-wrapper>`**: `class={cn("my-4 flex flex-col gap-2 rounded-lg border border-border bg-sidebar p-2")}`.
- **Scroll `<div>`**: `class={cn("overflow-x-auto overflow-y-auto rounded-md border border-border bg-background")}`.
- **`<table>`**: `class={cn("w-full divide-y divide-border border-collapse")}`.
- **`<thead>`**: `class={cn("bg-muted/80")}` (streamdown `components.tsx:500`).
- **`<tbody>`**: `class={cn("divide-y divide-border")}`.
- **`<th>`**: `class={cn("whitespace-nowrap px-4 py-2 text-left text-sm font-semibold")}`.
- **`<td>`**: `class={cn("px-4 py-2 text-sm")}`. Keep `data-velomark-align`.
- **Striping:** streamdown does NOT stripe — drop velomark's even-row stripe (matches streamdown).

**Tests:** `render-blocks.test.tsx:242-272` (wrapper, align attrs) must pass. **Verify/Commit.**

---

## Task 8: Math (inline + block)

**Files:** `src/math/math-view.tsx`, `src/core/render/blocks/math-block.tsx`, `src/core/render/inline/inline-token-view.tsx` (inline-math span)

Port conceptually from streamdown (no direct equivalent — streamdown uses rehype-katex). Keep velomark's `[data-velomark-inline-math]` / `[data-velomark-block-kind="math"]` hooks; replace the CSS rules (`styles.css:170-198`) with utilities.

**Steps:**

- **Inline math wrapper `<span data-velomark-inline-math>`** (`inline-token-view.tsx:39-44`): `class={cn("inline-flex items-center align-middle")}`.
- **Block math shell `<div>`** (`math-block.tsx`): `class={cn("my-4 rounded-md border border-border bg-background p-4")}`. Keep `data-velomark-block-kind="math"`.
- **Rendered math container** (`math-view.tsx`, the `[data-velomark-math-rendered]` element): block → `class={cn("block overflow-x-auto")}`; inline → `class={cn("inline-flex")}`.
- **Fallback `<pre><code>` / `<code>`**: add `class={cn("rounded-md bg-muted p-2 font-mono text-sm")}` on block fallback (KaTeX error fallback).

**Tests:** `render-blocks.test.tsx:419-465` (math block, `.katex-display`, fallback) must pass. **Verify/Commit.**

---

## Task 9: Mermaid

**Files:** `src/mermaid/mermaid-block.tsx`

Port conceptually from streamdown `components.tsx:881-922` + `lib/mermaid/*`.

> **Scope note:** pan-zoom/fullscreen/download land in main-plan Task 5. Here: style the mermaid container + loading + error states with utilities.

**Steps:**

- **Container**: `class={cn("group relative my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2")}`. Keep `data-velomark-mermaid`, `data-velomark-mermaid-diagram`.
- **Diagram bg `<div>`**: `class={cn("rounded-md border border-border bg-background")}`.
- **Loading state**: `class={cn("my-4 flex items-center justify-center gap-2 p-4 text-muted-foreground")}` + spinner `class={cn("h-4 w-4 animate-spin rounded-full border-current border-b-2")}`.
- **Error fallback `<pre><code>`**: `class={cn("mt-2 overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs")}` (neutral surface; reserve themed `destructive` for when velomark adds that token).

**Tests:** `render-blocks.test.tsx:467-571` must pass. **Verify/Commit.**

---

## Task 10: Images

**Files:** `src/core/render/inline/inline-token-view.tsx:13-15`

Port from streamdown `lib/image.tsx:123-161`.

> **Scope note:** download button + hover overlay land with main-plan Task 5 (mermaid-style controls). Here: style the `<img>`.

**Steps:**

- `<img>`: `class={cn("my-4 max-w-full rounded-lg")}`. Keep `loading="lazy"`, alt, src, title.

**Verify/Commit.**

---

## Task 11: Footnotes

**Files:** `src/core/render/footnotes/footnotes-section.tsx`

Streamdown adds no footnote-specific classes (`components.tsx:645-775`). Keep velomark's `[data-velomark-footnotes]` section.

**Steps:**

- **`<section data-velomark-footnotes>`**: `class={cn("text-sm text-muted-foreground")}`.
- **`<ol>`**: reuse the list class from Task 5.
- **`<li>`**: reuse Task 5 `<li>` class.
- **Backref `<a>`**: `class={cn("ml-1 text-primary")}`.

**Tests:** `render-blocks.test.tsx:355-386` must pass. **Verify/Commit.**

---

## Task 12: Directives (containers / leaf / text)

**Files:** `src/core/render/blocks/container-block.tsx`, `src/core/render/inline/inline-token-view.tsx` (text-directive default), `src/core/render/directives/directive-attribute-props.ts`

Streamdown has no directives — this is velomark-only. Keep minimal: directives render consumer-customizable shells; default styling should be neutral.

**Steps:**

- **Container default `<div>`** (`container-block.tsx:69-84`): `class={cn("my-4 rounded-md border border-border p-4")}`. Keep `data-velomark-container`, `data-velomark-leaf-directive`, `data-velomark-attr-*`.
- **Text-directive default `<span>`**: `class={cn("rounded bg-muted px-1 py-0.5 text-sm")}` (neutral badge look). Keep `data-velomark-text-directive`, `data-velomark-attr-*`.
- `directiveAttributeProps` (the `data-velomark-attr-*` rewriter) is unchanged — it already produces data-attrs, not classes.

**Tests:** `render-blocks.test.tsx:662-720` must pass. **Verify/Commit.**

---

## Task 13: Prefix support (`prefix` prop → prefixed `cn`)

**Files:** `src/core/theme/cn.ts`, `src/core/theme/cn-context.tsx`, `src/core/render/velomark.tsx`, `src/core/types.ts` (add prop), `src/index.tsx` (export type)

Port from streamdown `lib/utils.ts:9-33` (`prefixClasses`, `createCn`), `index.tsx:228-229,466`.

**Steps:**

- In `cn.ts`, add:
  ```ts
  export const prefixClasses = (prefix: string, classString: string): string => {
    if (!prefix || !classString) return classString;
    const p = `${prefix}:`;
    return classString
      .split(/\s+/)
      .filter(Boolean)
      .map((c) => (c.startsWith(p) ? c : `${p}${c}`))
      .join(" ");
  };
  export const createCn = (prefix?: string): CnFunction =>
    !prefix ? cn : (...inputs) => prefixClasses(prefix, twMerge(clsx(inputs)));
  ```
- Add `prefix?: string` to `VelomarkProps` (`src/core/types.ts` / `velomark.tsx`).
- In `velomark.tsx`: `const cn = createMemo(() => createCn(props.prefix));` and provide via `<CnProvider value={cn()}>`. Rename the local memo to avoid clashing with the imported `cn`.
- Every component already calls `useCn()` from Task 1's context — so prefix propagates automatically. **Audit:** ensure no component imports the bare `cn` directly for its own classes (only `highlighted-code-block` may use a module-level base for Shiki, which is dynamic and fine).

**Tests:** add to `cn.test.ts`: `createCn("tw")("p-2 p-4", "bg-red")` → `"tw:p-4 tw:bg-red"`. **Verify/Commit.**

---

## Task 14: Animation CSS (keyframes + `[data-velomark-animate]`)

**Files:** `src/core/theme/styles.css`

> The JS that emits `<span data-velomark-animate>` is the **animations feature task** (main-plan Task 2) — out of scope here. This task only ships the CSS so it's ready and `styles.css` is complete.

Port from streamdown `styles.css:1-35` + `lib/animate.ts:91-112`. Note streamdown's var names: `--sd-animation`, `--sd-duration`, `--sd-easing`, `--sd-delay` (NOT `-duration`/`-easing` suffixes). Velomark-equivalent names: `--vm-animation`, `--vm-duration`, `--vm-easing`, `--vm-delay`.

**Steps:** Append to `styles.css`:

```css
@keyframes vm-fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes vm-blurIn {
  from {
    opacity: 0;
    filter: blur(4px);
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
}
@keyframes vm-slideUp {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

[data-velomark-animate] {
  animation: var(--vm-animation, vm-fadeIn) var(--vm-duration, 150ms) var(--vm-easing, ease)
    var(--vm-delay, 0ms) both;
}
```

Coordinate the var-name choice with the animations feature task (use `--vm-*` consistently).

**Verify/Commit.**

---

## Task 15: README + consumer contract documentation

**Files:** `README.md`, `src/core/theme/__tests__/theme.test.ts` (add a contract test), `package.json` (peerDependencies note)

Port from streamdown `README.md:31-104`.

**Steps:**

- Add a "Styling" / "Setup" section to `README.md`:
  - Tailwind v4 is a peer dependency.
  - Add `@source "../node_modules/velomark/dist/*.js";` (with monorepo variant).
  - `import "velomark/styles.css";` (ships `@theme` bridge + KaTeX + keyframes).
  - Note: velomark is self-contained — no shadcn tokens required; the `@theme` block aliases utilities to `--velomark-*` vars, overridable via the `theme` prop / `applyTheme`.
  - `prefix` prop usage.
- Add a test asserting `styles.css` contains the `@theme` block + `@source`-scannable class strings exist in `dist/index.mjs` after build (smoke test).

**Verify/Commit.**

---

## Task 16: Final verification

- `vp check` — 0 errors/warnings.
- `vp test` — all pass; attribute/structure tests unchanged; `cn.test.ts` + updated `theme.test.ts` green.
- `vp pack` — `dist/{index.mjs, index.d.mts, styles.css}` produced; `styles.css` contains `@theme` + katex import + keyframes.
- `vp run test:packed-consumer` — consumer resolves classes.
- `vp dev` — visual sweep: headings, paragraph, bold/italic, inline code, link, hr, blockquote, ul/ol/task, code fence (copy + badge + highlight), table, math (inline + block), mermaid, image, footnotes, directives. Dark theme via `theme="dark"`.
- Confirm `data-velomark-*` attributes all still present (grep dist).

**Commit:** `refactor(theme): complete Tailwind utility-class port`.

---

## Follow-up: slim `VelomarkTheme` to the shadcn subset (after Task 16)

Because components now use only the shadcn utility names, most velomark-specific theme leaves are **dormant** — still emitted by `generateCssVars` and still in the type, but referenced by nothing. Candidates to remove (or fold into the surviving tokens): `color.surface.code`, `color.surface.codeStrong`, `color.surface.math`, `color.surface.quote`, `color.surface.tableHeader`, `color.surface.tableStripe`, `color.surface.diagram`, `color.link.*`, `color.quote.*`, `color.code.*`, `color.border.accent`, `color.border.strong`, `color.text.inverse`, `color.text.muted` (kept — aliased to `--color-muted-foreground`), and the `spacing.inlineCode*` / `spacing.codePadding*` / `radius.pill` leaves.

Surviving subset (aligns with the `@theme` bridge): `color.text.primary`, `color.text.muted`, `color.text.accent`, `color.text.inverse`, `color.surface.base`, `color.surface.elevated`, `color.border.default`, `radius.{sm,md,lg}`, `shadow.{xs,sm}`, `typography.{bodyFont,monoFont,lineHeight}`.

**Caveat — do NOT remove `color.diagram.*`:** `src/mermaid/to-mermaid-theme.ts` consumes those leaves to derive Mermaid's theme variables + `darkMode` flag. Either keep the diagram group, or (full streamdown parity) replace the token-driven mapper with a `mermaid.config` prop like streamdown and then drop the diagram group too.

This is a **separate, breaking-change task** (touches `VelomarkTheme` type, `default-theme.ts`, `dark-theme.ts`, `theme.test.ts:19-99` shape assertions, `velomarkColors`/`velomarkTokens` legacy exports). Do it AFTER the styling port lands green so the two changes are reviewable independently.

---

## Preserve (do NOT regress) — checklist

- [ ] `--velomark-*` var names that the `@theme` bridge aliases (the public, load-bearing subset: surface.base, text.primary/muted/accent/inverse, surface.elevated, border.default, radius.sm/md/lg, shadow.xs/sm, typography.\*). The dormant leaves can go in the follow-up above.
- [ ] `data-velomark-*` attribute names (test contract).
- [ ] `.velomark` root marker class + `data-velomark-root`.
- [ ] Public API: `applyTheme`, `resolveTheme`, `generateCssVars`, `mergeTheme`, `defaultTheme`, `darkTheme`, `velomarkColors`, `velomarkTokens`, `VelomarkTheme`.
- [ ] `./styles.css` package export.
- [ ] KaTeX `@import` in shipped CSS.
- [ ] Shiki per-token inline `style` (`highlighted-code-block.tsx`).
- [ ] Per-instance theming (inline `style` on root drives utilities via `@theme` aliases).
- [ ] No `[data-velomark-code-header]` / `[data-velomark-code-view-toggle]` introduced (tests forbid them).

## Risks / gotchas (from streamdown extraction)

1. **`--sidebar` is load-bearing** in streamdown for code/table/mermaid containers — the `@theme` bridge must define `--color-sidebar` (mapped to `--velomark-color-surface-elevated`) or those containers go transparent.
2. **`tailwindcss` becomes a peer dep** — consumers without Tailwind v4 get unstyled output. Document loudly.
3. **`@theme` processing** happens in the consumer's Tailwind build; verify the `@theme` block in an imported `styles.css` is honored (test in `test-consumer`). If not, move `@theme` into a separately-imported `theme.css` entry.
4. **Avoid arbitrary-value utilities** — this plan deliberately uses only shadcn utility names (`bg-muted`, `bg-sidebar`, `text-foreground`, …), NOT `bg-[var(--velomark-…)]`. Arbitrary-value utilities are verbose, not tailwind-merge-friendly, and (per review) unnecessary since we're adopting streamdown's look rather than preserving velomark's. If a future task needs a velomark-only token, prefer adding a `@theme` alias over an arbitrary-value utility.
5. **`em`/`del`/task-checkbox/footnote-backref** have NO streamdown classes (native) — decide consciously, don't accidentally over-style.
6. **Mermaid error colors** — streamdown hardcodes `red-*`; this plan uses `bg-muted` as a neutral fallback until a `destructive` token exists.
7. **Prefix two-stage pattern** (streamdown `body.tsx:4`) — only relevant once line-numbers land; bake `createCn`/context in now (Task 13) so it's not a retrofit.

## Execution handoff

After saving, implement task-by-task with `superpowers:executing-plans` or `superpowers:subagent-driven-development`. Tasks 2–12 are largely independent (different components) and can be parallelized across subagents once Task 1 lands; Task 13 (prefix) and Task 14 (keyframes) depend on Task 1 only.
