# Codeblock Parity with streamdown-code — Design

**Goal:** Create a velomark-native Shiki highlighter package (`packages/code/`) and fix the rendering layer in `packages/core` so code blocks reach full parity with streamdown-code.

**Architecture:** New `@velomark/code` package ports streamdown-code's highlighter logic (singleton cache, token cache, subscriber fan-out, JS regex engine, language aliases, text fallback, dual themes). The rendering layer in `packages/core` redirects token styles to CSS custom properties (`--vm-*`) so dark-mode class switching works, and consumes `result.bg/fg/rootStyle` for `<pre>` theming.

---

## 1. New Package: `packages/code/`

Mirrors `streamdown-code/index.ts` 1:1 in logic. Framework-agnostic plain TS (no Solid, no React).

**Exports:** `createCodePlugin(options?)`, `code` (pre-configured singleton), types (`CodePluginOptions`, `CodeHighlighterPlugin`, `HighlightResult`, `HighlightOptions`, `ThemeInput`).

**Logic (identical to streamdown-code):**

- Singleton highlighter cache: `Map<cacheKey, Promise<Highlighter>>` keyed by `lang-theme1-theme2`
- Token cache: `Map<cacheKey, TokensResult>` keyed by `lang:themes:length:first100chars:last100chars`
- Async subscriber fan-out: `Map<cacheKey, Set<callback>>`
- `normalizeLanguage()`: alias resolution from `bundledLanguagesInfo`, case-fold
- `text` fallback for unknown/truncated langs
- `createJavaScriptRegexEngine({ forgiving: true })`
- Default themes: `["github-light", "github-dark"]`

## 2. Dual-Theme Rendering (`packages/core`)

**Problem:** Current `buildTokenStyle()` sets `style.color = token.color` directly. Inline styles override CSS-based dark mode, so switching `.dark` class has no effect.

**Solution:** Redirect direct properties to CSS custom properties:

- `token.color` → `--vm-c` (light color as CSS var)
- `token.bgColor` → `--vm-tbg` (light bg as CSS var)
- `token.htmlStyle` entries: `"color"` → `--vm-c`, `"background-color"` → `--vm-tbg`, rest passthrough

`<pre>` consumes `result.bg` → `--vm-bg`, `result.fg` → `--vm-fg`, parsed `result.rootStyle` (Shiki's `--shiki-dark-bg`, `--shiki-dark-fg`).

CSS in `styles.css` switches via `.dark` selector:

```css
.vm-token {
  color: var(--vm-c, inherit);
}
.dark .vm-token {
  color: var(--shiki-dark, var(--vm-c, inherit));
}
```

## 3. FENCE_RE Widening

Current: `^```([A-Za-z0-9_-]+)?(.*)$` — truncates `c#` to `c`, rejects `c++`, `.env`, `f#`.

New: `^```(\S+)?(.*)$` — any non-whitespace as language. Matches CommonMark spec.

## 4. Dead Code Cleanup

Remove from `VelomarkCodeBlockOptions` and `DEFAULT_CODE_BLOCK_OPTIONS`:

- `highlightTheme?: string` — vestigial (themes are plugin-owned via `plugin.getThemes()`)
- `defaultView?: "preview" | "source"` — never consumed
- `previewToggle?: boolean` — never consumed

Remove dead export: `CodeBlockSkeleton` (file/exports remain despite ROADMAP saying removed).

## 5. Playground Wiring

Wire `@velomark/code` into `dev/components/renderer-panel.tsx` via `plugins={{ code: createCodePlugin() }}`.
