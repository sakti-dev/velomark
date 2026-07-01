# Velomark Roadmap — Streamdown Parity

Tracking the remaining feature gaps between velomark and streamdown, prioritized by user-visible value.

**Legend:** [done] / [next] / [planned]

---

## Tier 1 — High Impact, No Architecture Blocker

### 0. [done] Self-healing markdown (remend)

Integrated remend as a pre-pass inside `parseMarkdownToBlocks` — auto-completes unclosed bold, italic, inline code, strikethrough, links, and math before block parsing. Exposed via `VelomarkProps.remend?: RemendOptions` (`{}` = enabled with defaults, `undefined` = disabled). Zero-dep npm dependency.

### 1. [done] Code-block line numbers + `startLine` meta

Line numbers via CSS counters (`vm-line-numbers` / `vm-line::before`), default ON. Per-fence `noLineNumbers` meta hides; `startLine=N` offsets. Works on both plain and highlighted bodies. Global toggle via `VelomarkProps.lineNumbers` and `VelomarkCodeBlockOptions.lineNumbers`.

### 2. [planned] Wire up link-safety modal

`LinkSafetyModal` already exists in `render/compat/link-safety-modal.tsx` but isn't connected to link clicks. Streamdown intercepts all link clicks, shows a confirmation modal with the URL, and fires `onLinkCheck` callback.

**Scope:**

- Add `linkSafety` prop to `VelomarkProps` (boolean or config object)
- Intercept `<a>` clicks in `InlineTokenView` link rendering
- Wire modal open/confirm/cancel flow
- Export `onLinkCheck` callback

### 3. [done] Dual-theme Shiki dark mode

Token styles redirected to `--vm-*` CSS custom properties; `.dark` selector in `styles.css` switches to Shiki's `--shiki-dark` / `--shiki-dark-bg` vars. New `@velomark/code` package provides the Shiki highlighter with dual-theme support out of the box.

### 4. [done] Streaming caret indicator

Opt-in `caret?: "block" | "circle"` prop renders a blinking caret inline at the end of the last streaming block via CSS `::after` + `--velomark-caret` var. Hidden when the last block is an unclosed code fence or incomplete table (detected via parsed `status`).

### 5. [planned] Granular controls config

Velomark only has boolean `copyButton` / `downloadButton` on code blocks. Streamdown has a `ControlsConfig` covering copy/download/fullscreen per component type (code, table, mermaid).

**Scope:**

- Add `controls` prop to `VelomarkProps`:
  ```ts
  type ControlsConfig = {
    code?: { copy?: boolean; download?: boolean };
    table?: { copy?: boolean; download?: boolean; fullscreen?: boolean };
    mermaid?: { download?: boolean; fullscreen?: boolean; panZoom?: boolean };
  };
  ```
- Thread through to each component via context
- Merge with existing per-component options

---

## Tier 2 — Feature Parity

### 6. [planned] `isAnimating` state + disable controls while streaming

Derive an `isAnimating` signal from the block store (`status === "streaming"`). Use it to:

- Disable copy/download buttons during stream
- Gate the caret indicator (#4)
- Fire `onAnimationStart` / `onAnimationEnd` callbacks

### 7. [planned] Mermaid loading / error / retry UX

Velomark's mermaid falls back to source on error. Streamdown shows:

- Loading spinner during render
- Custom error component with retry button
- Retains last valid SVG during re-renders
- `mermaid.errorComponent` prop for custom error UI

**Scope:**

- Add loading state to `MermaidDiagram`
- Add retry mechanism
- Add `errorComponent` to mermaid plugin options
- Retain last valid SVG in a signal

### 8. [planned] Deferred mermaid rendering

Port streamdown's `useDeferredRender` hook (IntersectionObserver + `requestIdleCallback` + debounce). Mermaid diagrams are expensive to render; defer until visible + idle.

**Scope:**

- Create SolidJS `createDeferredRender` primitive
- Apply to `MermaidPluginView`

### 9. [planned] RTL text direction

`detectTextDirection` utility exists in velomark's lib but isn't wired up. Streamdown sets `dir="auto"` on the container and per-block.

**Scope:**

- Add `dir` prop to `VelomarkProps` (`"auto" | "ltr" | "rtl"`)
- Set `dir` attribute on block containers

### 10. [planned] Rich table clipboard

Streamdown's `TableCopyDropdown` copies as `text/plain` (TSV) AND `text/html` (formatted table) for spreadsheet/Docs paste. Velomark likely does plain-text only.

**Scope:**

- Add `text/html` clipboard data in `TableCopyDropdown`
- Port `extractTableDataFromElement` if needed

---

## Tier 3 — Ecosystem Polish

### 11. [planned] i18n / translations context

Port streamdown's `translations-context.tsx` (28 UI strings) to a Solid context. Allows consumers to localize button labels, tooltips, error messages.

### 12. [planned] Icon override system

Port streamdown's `icon-context.tsx`. Allows consumers to swap any icon (copy, download, fullscreen, caret, etc.) via an `icons` prop.

### 13. [planned] Tailwind `prefix` support

Port streamdown's `createCn` / `prefixClasses` to support Tailwind v4 `prefix()` configuration. Consumers using a class prefix (e.g. `tw-`) need this for styles to apply.

### 14. [planned] Custom HTML `allowedTags` + `literalTagContent`

For AI UIs with `<mention>`-style custom tags. Streamdown whitelists tags via `allowedTags` and escapes markdown inside them via `literalTagContent`. Requires sanitizer integration.

### 15. [planned] `normalizeHtmlIndentation`

Small utility that dedents multi-line HTML blocks so they aren't misinterpreted as indented code blocks.

### 16. [planned] Empty-footnote filtering during streaming

Streamdown hides the footnotes section while it's empty during streaming. Velomark renders it unconditionally.

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

---

## Not Porting (velomark's approach is better)

- **`mode="static"`** — velomark's reactive store handles non-streaming naturally
- **Animation rehype plugin** — velomark's memo-based pre-computation is cleaner than HAST mutation
- **Remark/rehype plugins** — velomark's custom parser doesn't need them; CJK uses `prePass`/`postPass` transforms
