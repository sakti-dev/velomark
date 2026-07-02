# Velomark Roadmap — Streamdown Parity

Tracking the remaining feature gaps between velomark and streamdown, prioritized by user-visible value.

**Legend:** [done] / [next] / [planned]

---

## Tier 1 — High Impact, No Architecture Blocker

### 0. [done] Self-healing markdown (remend)

Integrated remend as a pre-pass inside `parseMarkdownToBlocks` — auto-completes unclosed bold, italic, inline code, strikethrough, links, and math before block parsing. Exposed via `VelomarkProps.remend?: RemendOptions` (`{}` = enabled with defaults, `undefined` = disabled). Zero-dep npm dependency.

### 1. [done] Code-block line numbers + `startLine` meta

Line numbers via CSS counters (`vm-line-numbers` / `vm-line::before`), default ON. Per-fence `noLineNumbers` meta hides; `startLine=N` offsets. Works on both plain and highlighted bodies. Global toggle via `VelomarkProps.lineNumbers` and `VelomarkCodeBlockOptions.lineNumbers`.

### 2. [done] Wire up link-safety modal

`linkSafety?: boolean` prop on `VelomarkProps` intercepts `<a>` clicks in `InlineTokenView`, renders `LinkSafetyModal` via Portal at document body. Modal shows the URL with copy + open buttons. Close button and Escape key dismiss. On confirm, opens URL via `window.open(url, "_blank", "noopener,noreferrer")`.

### 3. [done] Dual-theme Shiki dark mode

Token styles redirected to `--vm-*` CSS custom properties; `.dark` selector in `styles.css` switches to Shiki's `--shiki-dark` / `--shiki-dark-bg` vars. New `@velomark/code` package provides the Shiki highlighter with dual-theme support out of the box.

### 4. [done] Streaming caret indicator

Opt-in `caret?: "block" | "circle"` prop renders a blinking caret inline at the end of the last streaming block. Uses JS DOM walk to pin `data-velomark-caret` on the deepest last element child (works inside lists, blockquotes, headings). Hidden when the last block is an unclosed code fence or incomplete table.

### 5. [done] Granular controls config

`controls?: ControlsConfig` prop on `VelomarkProps` — per-component-type visibility for copy/download/fullscreen/panZoom buttons. Threaded through `VelomarkStore` context. Applied to table (copy/download/fullscreen) and mermaid (download/fullscreen/panZoom) via `<Show>` wrappers with `?? true` defaults. Code blocks already had per-block `copyButton`/`downloadButton` options.

---

## Tier 2 — Feature Parity

### 6. [done] `isStreaming` context + `onAnimationStart` / `onAnimationEnd` callbacks

`isStreaming` memo (block-status-based, already existed for caret) is now exposed via `VelomarkStore` for child components. `docHasIncomplete` signal (unclosed code fence detection) drives the new lifecycle callbacks: `onAnimationStart` fires when the document transitions to incomplete, `onAnimationEnd` fires when it completes. Callbacks are deduplicated — they fire only on transitions, not on every content growth.

No button disabling (deferred to #5 granular controls config).

### 7. [done] Mermaid loading / error / retry UX

Ported streamdown's `Mermaid` component pattern to velomark's `MermaidDiagram`:

- `lastValidSvg` signal retains previous successful render during streaming
- Loading spinner during async render
- Error state with retry button (shown only when block is complete and no valid SVG)
- Unique chart IDs (hash + timestamp + random) instead of sequential integers
- Errors suppressed during streaming (`isIncomplete` — partial content expected to fail)
- `@velomark/mermaid` package (`createMermaidPlugin`) — exact port of streamdown-mermaid

### 8. [done] Reactive CodeBlockView branching — mermaid during streaming

Fixed critical SolidJS bug: `CodeBlockView` used non-reactive `if/else` for the mermaid language check. Since Solid component bodies run once, the branch was locked at creation time. During streaming, a fence language arrives gradually (`m` → `merma` → `mermaid`); if not `"mermaid"` at first evaluation, the block permanently rendered as a regular `CodeBlock`. Replaced with `<Switch>`/`<Match>` so the branch is reactive — when language transitions to `"mermaid"`, Solid swaps `CodeBlock` → `MermaidPluginView` in place.

### 9. [done] RTL text direction

Native HTML `dir` attribute support via `VelomarkProps.dir?: "auto" | "ltr" | "rtl"`. Applied to the container and all text-bearing block elements (paragraph, heading, blockquote paragraphs, list items). Uses browser-native `dir="auto"` per-element (Unicode Bidi Algorithm first-strong detection) — more accurate and zero-JS-cost compared to a regex-based approach. `detectTextDirection` dead-code util deleted.

### 10. [done] Rich table clipboard

Already implemented — `TableCopyDropdown` writes both `text/plain` (CSV/TSV/Markdown) and `text/html` (table `outerHTML`) via `ClipboardItem` for spreadsheet/Docs paste.

---

## Tier 3 — Ecosystem Polish

### 11. [done] i18n / translations context

`translations?: Partial<VelomarkTranslations>` prop — 36 UI string keys covering all button labels, tooltips, error messages, and modal text. Threaded through `VelomarkStore.t`. All hardcoded strings in components replaced with `vm.t.*`. Defaults in `lib/translations.ts`, exported as `defaultTranslations`.

### 12. [done] Icon override system

`icons?: Partial<IconMap>` prop — 10 icon keys (CheckIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, Loader2Icon, Maximize2Icon, RotateCcwIcon, XIcon, ZoomInIcon, ZoomOutIcon). Threaded through `VelomarkStore.icons`. All components use `vm.icons.*` instead of direct imports. Defaults in `render/icons.tsx`, exported as `defaultIcons`.

### 13. [not-planned] Tailwind `prefix` support

Velomark uses `cn` from `cnfast` directly — consumers with a Tailwind prefix should configure `cnfast` at the app level, not per-component.

### 14. [done] Custom HTML `allowedTags` + `literalTagContent`

`allowedTags?: Record<string, string[]>` whitelists custom HTML tags and their allowed attributes — unknown tags are stripped (children preserved), unlisted attributes filtered. `literalTagContent?: string[]` renders tag content as literal text (no markdown parsing). Node-level filter in `HtmlElementView` — no sanitizer dependency, no HTML string round-tripping.

### 15. [not-porting] `normalizeHtmlIndentation`

Velomark's parser has no indented-code-block detection — lines are `.trim()`'d before pattern matching, so indented HTML like `    <div>` already parses as an HTML block. The problem this solves (indented lines → code blocks) doesn't exist in velomark.

### 16. [done] Empty-footnote filtering during streaming

Already implemented — `footnotes-section.tsx` gates rendering on `orderedFootnotes().length > 0` via `<Show>`. Empty footnote sections are hidden during streaming and always.

---

## Completed

- [done] Animation system rewrite — single-pass `computeAnimation` with shared charCounter, continuous stagger, character-precise offset tracking (`8597398`)
- [done] Context consolidation — `VelomarkContext` + `BlockContext`, removed plugin-context (`8597398`)
- [done] Streaming remount stability — `isStreamGrowthMatch`, `areSameBlock`, string-key `<For>` (`3a0d2fa`)
- [done] Table animation — `computeAnimationMulti` with table-level shared counter (`0a543dd`)
- [done] Remove code-block skeleton loader — show streaming content instead (`8831ff6`)
- [done] Self-healing markdown (remend) — auto-completes unclosed inline formatting during streaming (`0658e45`)
- [done] Code-block line numbers + startLine meta — CSS counters, default ON, per-fence noLineNumbers/startLine (`4e82467`)
- [done] Streaming caret indicator — opt-in caret prop, CSS ::after blink, hidden on unclosed fences/tables (`4c4b074`)
- [done] Dual-theme Shiki dark mode — `@velomark/code` package, CSS-var redirect + `.dark` selector, FENCE_RE widened (`f0bbcea`)
- [done] `@velomark/code` package — Shiki highlighter plugin ported from streamdown-code, singleton cache, dual themes, streaming highlight (`f9948d9`)
- [done] `@velomark/math` package — KaTeX renderer plugin, wraps `katex.renderToString` with velomark's `MathRendererPlugin` interface
- [done] `@velomark/mermaid` package — Mermaid diagram plugin, exact port of streamdown-mermaid with lazy-init + configurable theme/security
- [done] Mermaid streaming fix — reactive `<Switch>`/`<Match>` in `CodeBlockView` so mermaid blocks are detected during streaming when language arrives gradually (`395eaa7`)
- [done] Mermaid error/loading/retry UX — `lastValidSvg`, error suppression during streaming, loading spinner, retry button (`7b85964`)
- [done] Mermaid fullscreen close fix — `stopPropagation` on close button prevents double-toggle (`b5026c9`)
- [done] Caret DOM walk — JS walk to deepest last element child instead of CSS `::after` on block wrapper; works inside lists/blockquotes/headings (`b92b37b`)
- [done] Debug log cleanup — removed 5 stale `console.log` from animation/inline rendering code (`c834001`)
- [done] RTL text direction — native `dir` prop (`"auto" | "ltr" | "rtl"`) on container + text blocks; browser-native bidi detection; `detectTextDirection` deleted
- [done] isStreaming context exposure — `isStreaming` + `docHasIncomplete` exposed via `VelomarkStore`
- [done] onAnimationStart/onAnimationEnd — lifecycle callbacks fired on `docHasIncomplete` transitions
- [done] Empty-footnote filtering — already gated via `<Show when={orderedFootnotes().length > 0}>`
- [done] Granular controls config — `ControlsConfig` prop for per-type button visibility (table/mermaid)
- [done] Link safety modal — `linkSafety` prop intercepts `<a>` clicks, shows confirmation modal
- [done] Rich table clipboard — `text/html` + `text/plain` via `ClipboardItem` (already implemented)
- [done] i18n translations — 36 UI string keys, `translations` prop, all components use `vm.t.*`
- [done] Icon override system — 10 icon keys, `icons` prop, all components use `vm.icons.*`
- [done] allowedTags + literalTagContent — tag/attribute whitelist + literal content rendering in HtmlElementView

---

## Not Porting (velomark's approach is better)

- **`mode="static"`** — velomark's reactive store handles non-streaming naturally
- **Animation rehype plugin** — velomark's memo-based pre-computation is cleaner than HAST mutation
- **Remark/rehype plugins** — velomark's custom parser doesn't need them
- **CJK plugin (streamdown-cjk)** — velomark's naive `indexOf` emphasis pairing already works for CJK (no flanking rules to fight); no autolink detection means no autolink-boundary problem. The problems streamdown-cjk solves are remark-specific.
- **`normalizeHtmlIndentation`** — velomark has no indented-code-block detection; lines are trimmed before pattern matching, so indented HTML already works
- **Tailwind `prefix` support** — velomark uses `cnfast` directly; prefix config belongs at the app level
