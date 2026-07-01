# Styling port + `data-velomark-*` slim (packages/core)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Supersedes `2026-07-01-styling-tailwind-port.md`.

**Goal:** Give `packages/core` streamdown's exact look via Tailwind v4 utility classes on each render component, and slim the `data-velomark-*` attribute surface to a small semantic set (tests migrate to class/role/tag selectors).

**Architecture:** Components import `cn` directly from `cnfast` (no wrapper) and call `class={cn("...", ...)}` with streamdown's verbatim class strings. A shipped `styles.css` carries the `@theme` bridge that aliases shadcn utility names (`bg-background`, `text-foreground`, `border-border`, `bg-muted`, `bg-sidebar`, `text-primary`, `text-muted-foreground`) to the existing `--velomark-*` token vars — so per-instance theming (inline `style` on the root) keeps driving the utilities. `tailwindcss` v4 becomes a peer dep; the consumer's Tailwind build scans the library via `@source`.

**Tech Stack:** Tailwind v4 (`@theme` + `@source`), `cnfast` (drop-in `cn`), SolidJS (`class=` not `className`). Tests need no Tailwind processing — they assert structure/DOM, not resolved CSS.

---

## Target `data-velomark-*` attribute policy

**Keep (semantic, can't be a class):**

- `data-velomark-root` — root marker.
- `data-velomark-block-kind="<kind>"` — block type on each block wrapper (paragraph/heading/code/container/html/html-element/math/blockquote/list/thematic-break/table). Load-bearing for tests + genuinely semantic.
- `data-velomark-incomplete` — present (no value) on blocks whose `status === "streaming"`. New, streamdown-parity.

**Drop (granular control/state — migrate selectors):**

- `data-velomark-block-id`, `data-velomark-block-index` → drop (identity/order asserted via kind + content + position).
- `data-velomark-code-copy`, `-code-copy-state`, `-code-copy-icon` → drop; select copy button by `button[aria-label]` (+ its class).
- `data-velomark-code-language` → drop; language badge gets a stable class.
- `data-velomark-code-highlighted` → drop; highlighted `<code>` selected by presence of child `<span>` tokens / a class.
- `data-velomark-mermaid`, `-mermaid-diagram` → drop; mermaid wrapper carries `data-velomark-block-kind="code"` + class; diagram selected by `svg` child.
- `data-velomark-math-rendered`, `-math-fallback`, `-inline-math`, `-inline-html` → drop; use class.
- `data-velomark-text-directive`, `-container`, `-leaf-directive`, `-heading-depth`, `-list-ordered`, `-table-wrapper`, `-align` → drop; use class/tag/content.
- `data-velomark-attr-*` (directive passthrough) → rework: directives pass user attrs through as **real HTML attrs** on the element (e.g. `class`, `data-*` authored by the user) rather than a prefixed `data-velomark-attr-*` namespace. Special case — handled in the directives task.

**Stable class hooks** (used where a selector can't be role/tag/content): each interactive/ambiguous element gets a semantic class via `cn`:

- copy button: `vm-code-copy`
- language badge: `vm-code-language`
- mermaid diagram container: `vm-mermaid-diagram`
- math rendered span: `vm-math`
- footnotes section: `vm-footnotes`
- table wrapper: `vm-table`

> These `vm-*` classes are unstyled hooks (Tailwind utilities do the actual styling), equivalent to streamdown's `data-streamdown="<name>"` role. Keep the list small + intentional.

---

## Task 1: Foundation — cnfast, Tailwind v4, `@theme` bridge

**Files:**

- Modify: `packages/core/package.json` (deps + peerDeps)
- Modify: `packages/core/src/theme/styles.css` (rewrite)
- Modify: `packages/core/vite.config.ts` (solid plugin already there; no Tailwind plugin needed for the lib itself)

**Step 1: Add deps**

- `packages/core/package.json` → `dependencies: { "cnfast": "<latest>" }`, `peerDependencies: { "solid-js": "...", "tailwindcss": "^4.1.18" }`.
- Run `vp install`.

**Step 2: Rewrite `styles.css`** to: keep the `.velomark { --velomark-*: <defaults> }` token block (theme fallback); add a top-level `@theme` bridge; add `@source` so the consumer's Tailwind scans library classes; keep the katex import. Skeleton:

```css
@import "katex/dist/katex.min.css";

/* Tell the consumer's Tailwind to scan the compiled library classes. */
@source "../render";

@theme {
  --color-background: var(--velomark-color-surface-base);
  --color-foreground: var(--velomark-color-text-primary);
  --color-muted: var(--velomark-color-surface-elevated);
  --color-muted-foreground: var(--velomark-color-text-muted);
  --color-primary: var(--velomark-color-text-accent);
  --color-primary-foreground: var(--velomark-color-text-inverse);
  --color-border: var(--velomark-color-border-default);
  --color-sidebar: var(--velomark-color-surface-elevated); /* load-bearing for code/table/mermaid */
  --font-sans: var(--velomark-typography-body-font);
  --font-mono: var(--velomark-typography-mono-font);
}

/* Existing per-instance token defaults stay: */
.velomark {
  --velomark-color-text-primary: #243041;
  /* ... rest of the current --velomark-* defaults unchanged ... */
}
```

Keep the `.velomark { ... }` token defaults verbatim from the current file. Drop any selectors in styles.css that styled `[data-velomark-*]` or `.velomark > * + *` — those become Tailwind utilities on components now. Leave ONLY: katex import, `@source`, `@theme`, `.velomark { --velomark-* defaults }`, and (later task) keyframes.

**Step 3: Verify** — `vp check` (styles.css is CSS, typechecks clean). `vp run --filter ./packages/core test` still green (tests don't resolve CSS).

**Step 4: Commit** — `feat(core): add cnfast + Tailwind v4 @theme bridge`

---

## Task 2: Inline text elements

**Files:** `packages/core/src/render/inline/inline-token-view.tsx`

**Steps:** For each case, add `class={cn("…", )}` (import `cn` from `cnfast`) using streamdown's verbatim strings, and apply the attr policy:

| Token                           | Classes                                            | Attr change                                                                                      |
| ------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `code` (inline)                 | `rounded bg-muted px-1.5 py-0.5 font-mono text-sm` | —                                                                                                |
| `strong`                        | `font-semibold`                                    | —                                                                                                |
| `em`                            | (italic via default `<em>`)                        | —                                                                                                |
| `link`                          | `font-medium text-primary underline wrap-anywhere` | —                                                                                                |
| `image`                         | wrapper none; `<img>` `max-w-full rounded-lg`      | —                                                                                                |
| `inline-math`                   | `vm-math` (the rendered span already has it)       | drop `data-velomark-inline-math`                                                                 |
| `html` (raw)                    | —                                                  | drop `data-velomark-inline-html`                                                                 |
| `text-directive` (default span) | `rounded bg-muted px-1 py-0.5 text-sm`             | drop `data-velomark-text-directive`; pass user attrs through as real attrs (see directives task) |

**Verify:** `vp check` + `vp run --filter ./packages/core test`. Fix test selectors that queried dropped attrs (see migration task).

**Commit:** `feat(core): style inline elements + slim inline attrs`

---

## Task 3: Headings, paragraph, hr

**Files:** `packages/core/src/render/blocks/{heading,paragraph,thematic-break}-block.tsx`

**Classes (streamdown verbatim):**

- h1 `mt-6 mb-2 font-semibold text-3xl`, h2 `… text-2xl`, h3 `… text-xl`, h4 `… text-lg`, h5 `… text-base`, h6 `… text-sm`
- paragraph: no class (streamdown leaves `<p>` unstyled) — keep unstyled.
- hr: `my-6 border-t border-border` (streamdown `my-6 border-border` + a top border).

**Attr change:** drop `data-velomark-heading-depth` (depth is in the tag `h1..h6`); drop per-block `block-id`/`block-index`.

**Verify + Commit:** `feat(core): style headings/paragraph/hr + slim attrs`

---

## Task 4: Lists + blockquote

**Files:** `packages/core/src/render/blocks/{list,blockquote}-block.tsx`

**Classes (streamdown verbatim):**

- ol: `list-inside list-decimal whitespace-normal [li_&]:pl-6`
- ul: `list-inside list-disc whitespace-normal [li_&]:pl-6`
- li: `py-1 [&>p]:inline`
- task list item checkbox: keep native `<input type=checkbox disabled>` (no streamdown class).
- blockquote: `my-4 border-l-4 border-muted-foreground/30 pl-4 text-muted-foreground italic`

**Attr change:** drop `data-velomark-list-ordered` (tag `ol`/`ul` says it); drop block-id/index.

**Verify + Commit:** `feat(core): style lists + blockquote + slim attrs`

---

## Task 5: Code block (shell + highlighted + copy + badge)

**Files:** `packages/core/src/render/code/{shell,highlighted-code-block}.tsx`, `packages/core/src/render/blocks/code-block.tsx`

**Classes (streamdown verbatim, velomark's existing absolute-circle layout kept per styling plan):**

- shell wrapper `<div>`: `relative my-4 w-full rounded-xl border border-border bg-sidebar p-2 text-sm`
- copy button: `vm-code-copy absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-all hover:bg-muted hover:text-foreground active:translate-y-px` + (copied → `text-primary`)
- language badge: `vm-code-language absolute bottom-2 right-2 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs lowercase text-muted-foreground`
- `<pre>` (highlighted): `overflow-x-auto rounded-md border border-border bg-background p-4 text-sm`

**Attr change:** drop `data-velomark-code-copy`, `-copy-state`, `-copy-icon`, `-code-language`, `-code-highlighted`, `-language`. Keep `aria-label` on the copy button. Keep `data-velomark-block-kind="code"` on the wrapper. Incomplete code blocks get `data-velomark-incomplete`.

**Verify + Commit:** `feat(core): style code block + slim code attrs`

---

## Task 6: Table

**Files:** `packages/core/src/render/blocks/table-block.tsx`

**Classes (streamdown verbatim):**

- wrapper: `vm-table my-4 w-full overflow-x-auto rounded-md border border-border`
- thead: `bg-muted/80`
- tbody: `divide-y divide-border`
- tr: `border-border`
- th: `whitespace-nowrap px-4 py-2 text-left font-semibold text-sm`
- td: `px-4 py-2 text-sm`
- **No row striping** (streamdown doesn't stripe).

**Attr change:** drop `data-velomark-table-wrapper` (→ `vm-table` class), `data-velomark-align` (use `text-left/center/right` class from align).

**Verify + Commit:** `feat(core): style table + slim table attrs`

---

## Task 7: Math + mermaid

**Files:** `packages/core/src/render/math/math-view.tsx`, `packages/core/src/render/code/mermaid-plugin-view.tsx`, `packages/core/src/render/blocks/math-block.tsx`

**Classes:**

- math block shell `<div>`: `my-4 rounded-md border border-border bg-background p-4`; rendered span keeps `vm-math`.
- mermaid wrapper: `group relative my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2`; diagram container `vm-mermaid-diagram rounded-md border border-border bg-background`; error fallback `<pre>` `mt-2 overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs`.

**Attr change:** drop `data-velomark-math-rendered`, `-math-fallback`, `-mermaid`, `-mermaid-diagram`. Math block wrapper keeps `data-velomark-block-kind="math"`; mermaid wrapper keeps `data-velomark-block-kind="code"`.

**Verify + Commit:** `feat(core): style math + mermaid + slim attrs`

---

## Task 8: Directives, footnotes, html blocks, container

**Files:** `packages/core/src/render/directives/directive-attribute-props.ts`, `packages/core/src/render/footnotes/footnotes-section.tsx`, `packages/core/src/render/blocks/{container,html,html-element}-block.tsx`

**Steps:**

- **Directive attr passthrough:** instead of namespacing user attrs as `data-velomark-attr-*`, pass them through to the rendered element as real attributes (filter to a safe allowlist: `class`, `style`, `id`, `data-*`, `aria-*`, `title`). Container directive → wrapper element gets `data-velomark-block-kind="container"`.
- **Footnotes section:** `vm-footnotes mt-6 border-t border-border pt-4 text-sm`; drop `data-velomark-footnotes` (→ class).
- **html / html-element / container blocks:** add `data-velomark-incomplete` when streaming; drop `block-id`/`index`.

**Verify + Commit:** `feat(core): style footnotes + rework directive attrs + slim attrs`

---

## Task 9: Root + `data-velomark-incomplete` wiring

**Files:** `packages/core/src/render/velomark.tsx`, `packages/core/src/render/render-block.tsx`

**Steps:**

- Root `<div>`: keep `data-velomark-root`; the `class="velomark …"` stays (the `.velomark` token scope).
- Thread block `status` through to the wrapper so each block gets `data-velomark-incomplete` when `status === "streaming"` (in `render-block` or each block component). Simplest: add it in the shared wrapper where `data-velomark-block-kind` is set.

**Verify + Commit:** `feat(core): wire data-velomark-incomplete on streaming blocks`

---

## Task 10: Test selector migration

**Files:** all `packages/core/src/**/__tests__/*.test.tsx`, `packages/core/test/mock-plugins.ts` (no change expected)

**Steps:** Replace every dropped `data-velomark-*` selector with its replacement:

- `[data-velomark-block-id]` / `-block-index` → `[data-velomark-block-kind]` + positional/content asserts.
- `[data-velomark-code-copy]` → `button[aria-label="Copy code"]` / `button[aria-label="Copied code"]`.
- `[data-velomark-code-copy-icon="copy"]` → `button[aria-label="Copy code"] svg` (the copy icon is the button's svg).
- `[data-velomark-code-language]` → `.vm-code-language`.
- `[data-velomark-code-highlighted]` → `pre > code` that has `span` children, or `.vm-code-highlighted` class (add to highlighted `<code>`).
- `[data-velomark-mermaid]` / `-mermaid-diagram` → `[data-velomark-block-kind="code"]` containing `.vm-mermaid-diagram` / `svg`.
- `[data-velomark-math-rendered]` / `-math-fallback` / `-inline-math` → `.vm-math`.
- `[data-velomark-footnotes]` → `.vm-footnotes`.
- `[data-velomark-table-wrapper]` → `.vm-table`.
- `[data-velomark-align]` → assert `text-left/center/right` class.
- `[data-velomark-attr-*]` (directive tests) → assert the passed-through real attr.
- The tests that assert `[data-velomark-code-header]` is null → keep as `null` (we still don't emit one) but switch to a positive selector, e.g. assert no `[data-vm-code-header]` (or just drop the negative assertion).

Update the theme test's `styles.css` assertions: the file now contains `@theme`, `--color-background: var(--velomark-color-surface-base)`, `@source`, `@import "katex...`. Drop assertions on removed selectors.

**Verify:** `vp check` + `vp run --filter ./packages/core test` → all green except the 1 pre-existing streaming-edge failure.

**Commit:** `test(core): migrate selectors to slim data-velomark + class hooks`

---

## Task 11: Visual verification + dev playground wiring

**Files:** `dev/components/renderer-panel.tsx` (import `<Velomark>` from `packages/core`)

**Steps:**

- Point the dev playground at `packages/core`'s `Velomark` (register real-ish mock plugins or no plugins → fallback) so `vp dev dev` renders the new styling via the playground's Tailwind build (the playground already runs `@tailwindcss/vite`).
- Visual sweep: headings, paragraph, bold/italic, inline code, link, hr, blockquote, ul/ol/task, code fence (copy + badge + highlighted tokens), table, math, mermaid, image, footnotes, directives. Dark theme via `theme="dark"`.
- Confirm `data-velomark-*` attributes are the slim set (grep dev DOM).

**Commit:** `chore(dev): wire playground to packages/core for styling verification`

---

## Out of scope (deferred)

- **`createCn(prefix)` / prefix contexts** (streamdown's line-number prefixing) — only relevant once line numbers land; defer.
- **Animations** (`tw-animate-css`, streamdown keyframes) — defer to a dedicated animation task.
- **Slimming `VelomarkTheme` tokens** to the shadcn subset (dormant leaves) — separate breaking-change task after this lands.
- **Real plugin packages** (`@velomark/code|math|mermaid`) — Phases 3–6.

## Verify gates (every task)

- `vp check` clean
- `vp run --filter ./packages/core test` green (1 pre-existing failure allowed)
- `git diff src/` empty (src/ stays the reference)
