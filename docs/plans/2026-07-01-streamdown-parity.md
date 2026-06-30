# Streamdown Feature-Parity Porting Plan

> **For Claude:** High-level plan. For each task: read streamdown source → port into velomark.
> Verify with `vp check && vp test` after each task. Commit per task.

**Goal:** Close all feature gaps between velomark and streamdown so velomark reaches feature parity while keeping its Solid-only nature and existing strengths (directives, footnotes, theme tokens, debug metrics).

**Architecture:** Velomark uses a custom parser → `RenderDocument` IR → stable-ID `<For>` render. Streamdown uses unified/remark/rehype → memo'd React blocks. Porting means **translating streamdown's logic into velomark's IR/Solid idioms**, not copying unified plugins verbatim. Where streamdown relies on a unified plugin, velomark either (a) ports the _behavior_ into its hand-written parser/renderer, or (b) wraps the unified plugin via a small adapter.

**Tech Stack:** SolidJS, TypeScript, Vitest, Shiki, KaTeX, Mermaid, vite-plus (`vp`).

**Reference tree:** `docs/references/streamdown/packages/`
**Velomark tree:** `src/`

**Conventions for every task:**

- Read the listed streamdown files first to understand behavior.
- Decide: port-as-behavior (into velomark's parser/renderer) vs. port-as-unified-plugin (wrap & feed through a unified pipeline). Prefer behavior-port to stay dependency-light.
- Co-locate tests in the matching `__tests__/` folder.
- Run `vp check && vp test`. Commit.

---

> **Path convention (post-restructure):** core logic lives under `src/core/` (`parser/`, `model/`, `patch/`, `render/`, `theme/`, `types.ts`); feature integrations under `src/{remend,code,math,mermaid,cjk}/`. Task bodies below were written pre-restructure — apply these prefixes to any `src/<parser|model|patch|render|theme|types>...` path. The one non-obvious remap: self-heal lives in `src/remend/` (NOT `src/parser/self-heal/`).

## Foundation (do these first)

### Task F1: Restructure `src/` to mirror streamdown packages — DONE

Hybrid reorg into `src/core/`, `src/code/`, `src/math/`, `src/mermaid/`, `src/remend/` (stub), `src/cjk/` (stub). Each feature folder has a barrel `index.ts`; core dispatch imports route through them. Committed on `feat/streamdown-parity`.

### Task F2: Tailwind design-system foundation (do before any UI task)

**Goal:** Replace plain-CSS component styling with Tailwind utility classes inline in components + shadcn design tokens, fully matching streamdown's distribution model. Every later UI task (animations, line numbers, mermaid controls, `components` override) then writes Tailwind utilities — so this MUST land before any of them to avoid double-work.

**Consumer-facing impact (deliberate):** consumers must use Tailwind v4 and add `@source "../node_modules/velomark/dist/*.js";` to their `globals.css`. Velomark stops shipping self-contained component CSS — only keyframes + the KaTeX `@import` remain in `styles.css`.

**Read (streamdown):**

- `packages/streamdown/README.md:31-66` — `@source` directive + monorepo path adjustment.
- `packages/streamdown/README.md:68-104` — shadcn CSS custom properties (`:root` + `.dark`: `--background`, `--foreground`, `--card`, `--card-foreground`, `--muted`, `--muted-foreground`, `--border`, `--input`, `--primary`, `--primary-foreground`, `--radius`).
- `packages/streamdown/lib/utils.ts` — `cn` helper (clsx + tailwind-merge).
- `packages/streamdown/index.tsx:229,466` — `prefix` prop → prefixed `cn`.
- `packages/streamdown/lib/components.tsx` — canonical reference for how every element is styled with utilities (code, table, blockquote, h1-h6, links, lists, paragraphs, images).
- `packages/streamdown/lib/code-block/*` — code-block utilities (header, copy button, line-number gutter, body).
- `packages/streamdown/styles.css` — minimal: only `@keyframes sd-*` + `[data-sd-animate]` (everything else is utilities).
- `packages/streamdown/package.json:63-80` — `clsx` + `tailwind-merge` as runtime deps.

**Implement in velomark:**

- **Deps:** add `clsx` + `tailwind-merge` to `dependencies`; move `tailwindcss` to `peerDependencies` (v4), keep in `devDependencies`.
- **`cn` helper:** create `src/core/theme/cn.ts` — clsx + tailwind-merge, prefix-aware (namespaces classes via a `prefix`, mirroring streamdown's prop).
- **Tokens:** extend `src/core/theme/generate-css-vars.ts` to ALSO emit shadcn-compatible names mapped from `VelomarkTheme` (`--background`←surface.base, `--foreground`←color.text.primary, `--card`, `--card-foreground`, `--muted`, `--muted-foreground`, `--border`, `--input`, `--primary`, `--primary-foreground`, `--radius`). Velomark tokens stay the source of truth; shadcn names are the surface the utilities resolve against (`bg-background`, `text-foreground`, `border-border`, `rounded-radius`).
- **Tailwind v4 `@theme`:** provide a velomark `@theme` block (documented snippet) so utilities like `bg-card` resolve to `--card`.
- **Convert every component** in `src/core/render/{blocks,inline,footnotes,directives}/*`, `src/core/render/{render-block,html-element-view,velomark}.tsx`, `src/code/*`, `src/math/*`, `src/mermaid/*` from CSS classes → inline Tailwind utilities via `cn()`.
- **Shrink `src/core/theme/styles.css`** to `@import "katex/..."` + the keyframes/animate rules (animate rules land with Task 2). Remove all `.velomark ...` component rules.
- **`prefix` prop:** add to `VelomarkProps`, thread through `cn`.
- **Docs:** README — required `@source` directive, `@theme` snippet, Tailwind v4 peer-dep note.
- **Playground:** `dev/` already uses Tailwind — keep working.

**Tests:** `src/core/theme/__tests__/cn.test.ts` (merge + prefix); update `theme.test.ts` ("ships consumable styles.css" + CSS-var-content assertions change); `data-velomark-*` attribute tests remain valid. Keep `vite.config.ts` `pack.copy` for `styles.css` (keyframes + KaTeX).

**Risk:** large mechanical touch across every component. Mitigate: convert file-by-file, `vp check && vp test` after each batch. KaTeX `@import` MUST stay in shipped CSS.

---

## P0 — Major, user-visible gaps

### Task 1: Streaming self-healing (inline auto-close) — `remend` equivalent

**Gap:** Unclosed `**`, `*`, `__`, `` ` ``, `~~`, `$$`, `$`, `[t](url`, `![alt](url` drop as literal text during streaming.

**Read (streamdown):**

- `packages/remend/src/index.ts` — orchestrator, option shape, priority system
- `packages/remend/src/emphasis-handlers.ts` — bold/boldItalic/italic (`*` `_` `__`)
- `packages/remend/src/inline-code-handler.ts`
- `packages/remend/src/strikethrough-handler.ts`
- `packages/remend/src/katex-handler.ts` — block `$$` + opt-in inline `$`
- `packages/remend/src/link-image-handler.ts` — links → sentinel URL, images → removed
- `packages/remend/src/single-tilde-handler.ts`, `comparison-operator-handler.ts`, `html-tag-handler.ts`, `setext-heading-handler.ts`
- `packages/remend/src/utils.ts`, `patterns.ts`, `code-block-utils.ts`
- `packages/remend/README.md` — full handler/priority table + custom-handler API

**Implement in velomark:**

- Create: `src/parser/self-heal/` mirror of remend's `src/` (one file per handler + `index.ts` orchestrator + `utils.ts`).
- Wire: call the self-heal preprocessor on the raw `props.markdown` **before** block parsing in `src/model/render-document.ts` `buildRenderDocument()` (mirrors streamdown's single pre-split remend call).
- Add `selfHeal?: boolean | SelfHealOptions` prop to `VelomarkProps` (`src/render/velomark.tsx:18`) defaulting to `true`; forward options.
- Inline `$` and link-sentinel behaviors: define a velomark sentinel (e.g. `velomark:incomplete-link`) and recognize it in `src/parser/inline-parser.ts` link path to mark the link incomplete.
- Keep remend's **context utilities** (`isWithinCodeBlock`, `isWithinMathBlock`, `isWithinLinkOrImageUrl`, `isWordChar`) — export them for custom handlers.
- Custom-handler API: `SelfHealHandler { name; handle(text): string; priority? }` via `options.handlers`.

**Tests:** `src/parser/self-heal/__tests__/` — port remend's per-handler `__tests__/` (they are pure string→string, framework-agnostic → near-direct port).

---

### Task 2: Streaming animations (caret + token fade/blur/slide)

**Gap:** No cursor while streaming; no token reveal animation.

**Read (streamdown):**

- `packages/streamdown/lib/animate.ts` — rehype plugin injecting `<span data-sd-animate>` + cross-render char tracking (`getLastRenderCharCount`); animation kinds `fadeIn/blurIn/slideUp`; `AnimateOptions`.
- `packages/streamdown/styles.css` — `@keyframes sd-fadeIn / sd-blurIn / sd-slideUp` + `[data-sd-animate]` rule.
- `packages/streamdown/index.tsx:188-235, 479-500, 588-607, 725-727, 739-755` — `animated`, `isAnimating`, `caret`, `onAnimationStart/End` props; caret CSS var injection.
- `packages/streamdown/index.tsx:327-425` — how `Block` reads `getLastRenderCharCount()` before child render so prior chars get `duration:0ms`.

**Implement in velomark:**

- Adaptation note: streamdown uses a rehype plugin over HAST; velomark has its own `InlineToken` IR. Implement animation as a **post-processing pass over `InlineToken[]`** in `src/render/inline/render-inline.tsx` that wraps text tokens into per-word `<span data-velomark-animate>` with CSS vars when `isAnimating` is true.
- Cross-render tracking: keep a module-level last-char-count per block id (Solid has no equivalent of React's render-phase ref; use a `Map<blockId, number>` stored in a closure in `velomark.tsx`).
- Add CSS vars `--velomark-animation / -duration / -easing / -delay` and keyframes to `src/theme/styles.css`.
- New props on `VelomarkProps`: `animated?: boolean | AnimateOptions`, `isAnimating?: boolean`, `caret?: "block" | "circle" | "none"`, optional `onAnimationStart/End`.
- Caret: `::after` on the last streaming block, suppressed when last block is an incomplete code fence or table (mirror streamdown's `incomplete-code-utils.ts`).

**Tests:** `src/render/inline/__tests__/animate.test.tsx` — assert presence of `data-velomark-animate` spans, that already-shown chars get `duration:0ms`, caret element exists/hidden per block kind.

---

### Task 3: CJK text handling

**Gap:** No CJK-aware emphasis/spacing/strikethrough/autolink-boundary rules. CJK text butts against ASCII awkwardly.

**Read (streamdown):**

- `packages/streamdown-cjk/index.ts` — wraps `remark-cjk-friendly` + `remark-cjk-friendly-gfm-strikethrough` and the bespoke `remarkCjkAutolinkBoundary` plugin (lines 33-131 split autolinks at CJK punctuation).
- `packages/streamdown/index.tsx:670-687` — plugin ordering (`cjk.before → remarkGfm → cjk.after → math`).

**Implement in velomark:**

- Decision: velomark's parser is hand-written, so port the **behaviors**, not the remark plugins.
- Emphasis/strikethrough with CJK: in `src/parser/inline-parser.ts` `parseDelimited` / emphasis paths, allow CJK chars as valid flanking (mirror `remark-cjk-friendly` rules — emphasis markers can open/close across CJK boundaries).
- CJK autolink boundary: once Task 6 (autolinks) lands, trim autolink URLs at CJK punctuation (。、，．）〕 etc.) — port `remarkCjkAutolinkBoundary` logic into the autolink scanner.
- CJK-aware strikethrough: relax `~~` flanking for CJK in the strikethrough parser.
- Optional fast win: add a `cjk?: boolean` prop (default off) gating these relaxations to avoid changing behavior for non-CJK users.

**Tests:** `src/parser/__tests__/inline-parser-cjk.test.ts` — emphasis across CJK, autolink trimming, strikethrough flanking.

---

## P1 — Important gaps

### Task 4: Code block line numbers + `startLine`

**Gap:** No line-number gutter; no `startLine=N` meta.

**Read (streamdown):**

- `packages/streamdown/lib/code-block/body.tsx:14-27, 104-116` — CSS-counter-based line numbers; `startLine` → `counter-reset`.
- `packages/streamdown/lib/components.tsx:32-33, 817-832, 828-832` — metastring parsing for `startLine=N` and `noLineNumbers`.
- `packages/streamdown/index.tsx:231` — global `lineNumbers` prop (default `true`).

**Implement in velomark:**

- Add CSS-counter line numbers in `src/render/code-blocks/default-code-block-shell.tsx` / `highlighted-code-block.tsx` (render token lines as `<span class="velomark-code-line">` and use `::before` counters — copy streamdown's CSS).
- Parse fence metastring in `src/parser/context.ts:8` (the fence-language regex) to also capture `startLine=N` and `noLineNumbers`; thread through `RenderBlock` data into the code renderer.
- Add `lineNumbers?: boolean` to `VelomarkCodeBlockOptions` (`src/types.ts:138`) and a global default on `VelomarkProps`.

**Tests:** `src/render/code-blocks/__tests__/line-numbers.test.tsx`.

---

### Task 5: Mermaid lazy render + pan/zoom/fullscreen/download + `controls`

**Gap:** Mermaid renders only on block-complete; no viewport lazy, no zoom, no fullscreen, no download.

**Read (streamdown):**

- `packages/streamdown/lib/mermaid/` — full directory (PanZoom, download SVG/PNG, fullscreen).
- `packages/streamdown-mermaid/index.tsx:34-38, 74-89, 121-189` — `useDeferredRender` gating, `lastValidSvg`, `errorComponent` + retry, PanZoom wiring.
- `packages/streamdown/hooks/use-deferred-render.ts` — IntersectionObserver + debounce + `requestIdleCallback`.
- `packages/streamdown/lib/components.tsx:135-159` — `controls` prop shape (per-feature copy/download/fullscreen for code/table/mermaid).

**Implement in velomark:**

- Port `useDeferredRender` as a Solid primitive `createDeferredRender` in `src/render/blocks/mermaid-block.tsx` (or a shared `src/hooks/`). Use `onMount` + IntersectionObserver; Solid has no `requestIdleCallback` wrapper — call the browser API directly with a fallback to `setTimeout`.
- Keep current `status === "complete"` gate AND add viewport-visibility gate (render when both complete & visible).
- Port PanZoom: lightweight pan/zoom (pointer events + wheel) in a new `src/render/blocks/mermaid-pan-zoom.tsx`.
- Port download (SVG + PNG serialize) + fullscreen (`requestFullscreen` API).
- Add `controls?: VelomarkControls` prop to `VelomarkProps` mirroring streamdown's shape: `{ mermaid?: { copy?, download?, fullscreen? }, code?: {...}, table?: {...} }`. Gate existing code copy button + table extras behind it too.

**Tests:** `src/render/blocks/__tests__/mermaid-lazy.test.tsx` (mock IntersectionObserver), pan-zoom unit tests.

---

### Task 6: Autolinks (bare URL + `<url>`)

**Gap:** Only explicit `[t](u)` / reference links recognized; no bare-URL or angle-bracket autolinking.

**Read (streamdown):**

- Behavior comes from `remark-gfm` autolink-literal. No custom code — it's a remark plugin.
- `packages/streamdown-cjk/index.ts:99-131` — autolink-boundary splitter (relevant once CJK is on).

**Implement in velomark:**

- Add an autolink scanner in `src/parser/inline-parser.ts` that runs in the inline-text path: detect `http(s)://…` and `www.…` and bare email, emit an `InlineLinkToken` whose children are the URL text. Reference GFM autolink-literal extension rules for valid boundary chars.
- Add angle-bracket `<url>` autolink in the same scanner.
- Wire into the existing link renderer (`src/render/inline/inline-token-view.tsx`) — no new token type needed.

**Tests:** `src/parser/__tests__/inline-parser-autolink.test.ts`.

---

### Task 7: HTML sanitization (opt-in)

**Gap:** Raw inline HTML rendered via `innerHTML` unsanitized (by design). Bring opt-in sanitization for untrusted inputs.

**Read (streamdown):**

- `packages/streamdown/index.tsx:250-263` — default rehype stack (`rehype-raw`, `rehype-sanitize`, `rehype-harden`).
- `packages/streamdown/index.tsx:238-248, 693-715` — sanitize schema extension via `allowedTags`.
- `packages/streamdown/index.tsx:522-524, 717-719`, `packages/streamdown/lib/rehype/literal-tag-content.ts` — `literalTagContent` for entity-style tags.
- `packages/streamdown/lib/preprocess-custom-tags.ts`, `preprocess-literal-tag-content.ts`.

**Implement in velomark:**

- Decision: do not pull in unified just for this. Either (a) adopt a small allowlist sanitizer lib (e.g. `sanitize-html` or a minimal hand-rolled allowlist over the structured `html-element` token path), or (b) wrap rehype-sanitize as an optional dependency.
- Add `sanitize?: boolean | VelomarkSanitizeOptions` prop to `VelomarkProps`. When on, filter tag names + attributes + href protocols in `src/parser/html-element.ts` and the raw-html inline path in `src/render/inline/inline-token-view.tsx:45-46`.
- Default off to preserve current trusted-input behavior; document the tradeoff.

**Tests:** `src/parser/__tests__/html-sanitize.test.ts` — XSS payloads blocked, safe tags pass.

---

## P2 — Polish / ecosystem

### Task 8: Plugin slots (code / mermaid / math / cjk swappable)

**Gap:** No formal plugin system; everything bundled.

**Read (streamdown):**

- `packages/streamdown/lib/plugin-types.ts` — `PluginConfig` shape (`{code?, mermaid?, math?, cjk?, renderers?}`).
- `packages/streamdown/lib/plugin-context.tsx` — `PluginContext` + hooks (`useCodePlugin`, `useMermaidPlugin`, `useCustomRenderer`).
- `packages/streamdown/index.tsx:670-737` — plugin wiring.

**Implement in velomark:**

- Define `VelomarkPluginConfig` in `src/types.ts`. Keep it lighter than streamdown's (velomark has no unified pipeline): slots are factory functions returning `{ highlight?, renderMermaid?, parseMath?, cjk? }`.
- Replace direct imports of `shiki-manager`, `mermaid-block`, `math-view` internals in the renderers with `useContext(PluginContext)`.
- Default the context to the current bundled implementations so behavior is unchanged when no plugins passed.

**Tests:** `src/__tests__/plugin-context.test.tsx`.

---

### Task 9: Generic `components` prop (node-type renderer override)

**Gap:** Only `codeBlockRenderers` and `containers` exist; no generic per-node-type override.

**Read (streamdown):**

- `packages/streamdown/lib/markdown.ts:31-41` — react-markdown `components` map merged over defaults.
- `packages/streamdown/lib/components.tsx` — all default memo'd components and how they're keyed by hast node name.

**Implement in velomark:**

- Add `components?: Partial<VelomarkComponentMap>` to `VelomarkProps` where keys map to velomark's block kinds / inline token types (`paragraph`, `heading`, `code`, `table`, `link`, `image`, …).
- Look up overrides at the top of `src/render/render-block.tsx` (block-level) and `src/render/inline/inline-token-view.tsx` (inline-level) before the default switch.

**Tests:** `src/render/__tests__/components-override.test.tsx`.

---

### Task 10: i18n + icons override + class prefix + link-safety modal + `allowedTags`/`literalTagContent`

**Gap:** Several streamdown ergonomic/security props absent.

**Read (streamdown):**

- i18n: `packages/streamdown/lib/translations-context.tsx` + `index.tsx:225, 640-643`.
- icons: `packages/streamdown/lib/icons.tsx`, `icon-context.tsx`.
- prefix: `index.tsx:229, 466`, `lib/utils.ts`.
- link-safety: `index.tsx:168-172, 205`, `lib/link-modal.tsx`, `components.tsx:263-360`.
- `allowedTags`/`literalTagContent`: see Task 7 refs.

**Implement in velomark (pick subset per priority):**

- `translations?: Partial<VelomarkTranslations>` — start small: copy-button "Copied!", mermaid error, etc.
- `icons?: Partial<VelomarkIcons>` — override the SVGs in `default-code-block-shell.tsx`.
- `prefix?: string` — namespace all emitted classes/`data-*` attrs (mechanical rename pass).
- `linkSafety?: { enabled; onLinkCheck?; renderModal? }` — render links as buttons opening a confirm modal; only enable if sanitize story is also on.
- `literalTagContent?: string[]` — tags whose children render as plain text (extends Task 7).

**Tests:** co-locate per feature.

---

### Task 11: `normalizeHtmlIndentation`

**Gap:** AI-pretty-printed HTML with 4-space indent gets misparsed as code blocks.

**Read (streamdown):** `packages/streamdown/index.tsx:109-133, 195`.

**Implement in velomark:** add a preprocessor in `src/model/render-document.ts` (before parsing) that strips leading 4+ space indentation immediately preceding `<tag` when `normalizeHtmlIndentation?: boolean` is on.

**Tests:** `src/model/__tests__/normalize-html-indentation.test.ts`.

---

### Task 12: Benchmarks (`vitest bench` parity)

**Gap:** No perf benchmarks.

**Read (streamdown):** `packages/streamdown/__benchmarks__/markdown.bench.ts`, `parse-blocks.bench.ts`, `streamdown-vs-react-markdown.bench.ts`, `table-utils.bench.ts`; `packages/remend/__benchmarks__/remend.bench.ts`.

**Implement in velomark:** create `src/__benchmarks__/` mirroring the suite: `parse.bench.ts`, `render.bench.ts`, `self-heal.bench.ts` (after Task 1). Run via `vitest bench`.

---

## Quick wins (do anytime, low risk)

- **CW-1:** Remove unused `shiki-stream` dep from `package.json:52` — OR adopt it in `highlighted-code-block.tsx` (decide during Task 1/4).
- **CW-2:** Add `@media (prefers-color-scheme: dark)` to `src/theme/styles.css` so dark mode works without explicit prop.
- **CW-3:** Wire or remove `defaultView` / `previewToggle` options declared in `src/types.ts:140,144` but unused in `default-code-block-shell.tsx`.
- **CW-4:** Delete or wire `src/patch/render-patch.ts` (dead code, tests-only).
- **CW-5:** Auto-generate `src/theme/styles.css` defaults from `defaultTheme` instead of hand-maintaining duplicates.

---

## Suggested execution order

1. **Quick wins CW-1..CW-5** — clean baseline.
2. **Task 1 (self-heal)** — foundational; unblocks better streaming everywhere.
3. **Task 2 (animations)** — biggest visible UX win.
4. **Task 3 (CJK)**.
5. **Tasks 4, 5, 6** — independent, parallelizable.
6. **Task 7 (sanitize)** — security gate before advertising untrusted-input support.
7. **Tasks 8–11** — ecosystem/polish.
8. **Task 12 (benchmarks)** — capstone.

## Preserve (do NOT regress)

- `:::` / `::` / `:` directives (streamdown has none — velomark wins).
- Full footnote support (streamdown only partial).
- Semantic theme tokens + `mergeTheme` / `generateCssVars` / `applyTheme` + Mermaid token mapping.
- `onDebugMetrics` telemetry.
- `RenderDocument` IR with `sourceStart/sourceEnd` offsets and stable IDs.

## Execution handoff

Plan saved. When implementing, recommended sub-skill: `superpowers:executing-plans` (task-by-task with checkpoints) or `superpowers:subagent-driven-development` (fresh subagent per task in this session).
