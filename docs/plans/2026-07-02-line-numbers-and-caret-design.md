# Code-block line numbers + streaming caret — Design

Date: 2026-07-02
Status: Approved
Branch: `feat/streamdown-parity`
ROADMAP items: #1 (line numbers), #4 (streaming caret)

## Goal

Port two streamdown Tier 1 features to velomark, matching streamdown's
behavior exactly while adapting to velomark's Solid/parser architecture:

1. **Code-block line numbers** — CSS-counter-based gutter, default ON, with
   per-fence `startLine=N` and `noLineNumbers` meta overrides.
2. **Streaming caret** — blinking caret (`▋` or `●`) inline at the end of the
   last streaming block, hidden while the last block is an unclosed code fence
   or incomplete table.

## Reference (streamdown)

Verified against streamdown's published source
(`streamdown/dist/chunk-BO2N2NFS.js`):

### Line numbers

- `StreamdownProps.lineNumbers?: boolean` — `@default true`.
- `CodeBlockProps.startLine?: number` (default 1), `CodeBlockProps.lineNumbers?: boolean`.
- Implementation: CSS counters. `<code>` gets `counter-reset: line` (+ `counter-increment: line 0`); each line `<span>` carries `counter-increment: line` and a `::before { content: counter(line) }`.
- `startLine > 1` → `<code>` style `counterReset: \`line ${startLine - 1}\``.
- Per-fence meta parsed from the fence's metastring:
  - `startLine=(\d+)` → offset.
  - `\bnoLineNumbers\b` → disables for that fence.
- Per-fence resolution: `showLines = !(meta has noLineNumbers) && (global lineNumbers !== false)`.

### Caret

- `StreamdownProps.caret?: keyof typeof carets` where `carets = { block: " ▋", circle: " ●" }` (note the leading space).
- Opt-in; `undefined` → no caret.
- Reactive logic:
  - `Ge` (hide) = `isStreaming && blocks.length > 0 && (hasIncompleteCodeFence(lastBlock) || isIncompleteTable(lastBlock))`.
  - CSS var `--streamdown-caret` set on root when `caret && isStreaming && !Ge`.
- Rendering: root gets `[&>*:last-child]:after:content-[var(--streamdown-caret)]`.
- Empty-content edge case: when `blocks.length === 0 && caret && streaming`, render an empty `<span>` so `::after` has a target.
- Streamdown detects incomplete fence/table via regex on the last block's raw markdown (`ht`, `Uo`).

## Decisions

### Approach: CSS counters (A1) + CSS `::after` var (B1)

Both features mirror streamdown's CSS-driven approach rather than a
Solid-reactive gutter / explicit caret element. Rationale:

- **Fewer DOM nodes.** Pseudo-elements do the work; no per-line gutter spans,
  no extra caret element.
- **Solid-idiomatic.** "Solid-idiomatic" means use reactivity where _state
  changes_ and let CSS/DOM do what it's good at. Solid updates the spans
  (fine-grained); CSS numbers/positions them. A reactive memo drives the caret
  CSS var; CSS renders the blink. This is the idiomatic split — not forcing
  signals into browser-declarative territory.
- **Exact parity** with streamdown behavior and visual output.
- **Wrapping-safe** line numbering (CSS counters survive line-wrap; a gutter
  `<div>` would desync).

### Architectural difference from streamdown

Streamdown detects incomplete fence/table via regex on raw markdown. Velomark
already parses per-block `status: "streaming" | "complete"` in its block
parser, so the caret logic uses parsed state directly — a code/table block
with `status === "streaming"` means the fence/table isn't closed yet. Cleaner
than regex, no double parsing.

### Fence meta capture

`FENCE_RE` currently captures only the language. It will be widened to capture
the full metastring after the language. `CodeBlockData` gains an optional
`meta` field. This unblocks future meta-driven features (line numbers today,
potentially title/highlight ranges later) and matches streamdown's
`CustomRendererProps.meta`.

## Feature A: Code-block line numbers

### Data flow

1. **Parser** (`lib/parser/context.ts` + `lib/parser/block-boundaries.ts`):
   - `FENCE_RE`: `^```([A-Za-z0-9_-]+)?\s*$` → `^```([A-Za-z0-9_-]+)?(.*)$`.
     Group 1 = language (unchanged), group 2 = raw meta (trimmed; `""` → `undefined`).
   - `CodeBlockData`: `{ code: string; language?: string; meta?: string }`.
   - Fence block construction stores `meta` from `fenceMatch[2]`.

2. **Options** (`types.ts` + `render/code-block/index.tsx`):
   - `VelomarkCodeBlockOptions.lineNumbers?: boolean`.
   - `DEFAULT_CODE_BLOCK_OPTIONS.lineNumbers = true`.
   - `VelomarkProps.lineNumbers?: boolean` → threaded through `VelomarkProviderProps`
     → store → merged into `resolveCodeBlockOptions`.

3. **Per-fence resolution** (`render/blocks/code-block.tsx`):
   - Parse `data().meta` (regexes `/startLine=(\d+)/` and `/\bnoLineNumbers\b/`).
   - `startLine = parsed && parsed >= 1 ? parsed : 1`.
   - `showLines = options().lineNumbers && !hasNoLineNumbersMeta`.
   - Pass `lineNumbers` + `startLine` to `<CodeBlock>`.

4. **`<CodeBlock>`** (`render/code-block/index.tsx`): add `lineNumbers` and
   `startLine` props; forward to `CodeBlockBody` / `HighlightedCodeBlockBody`.

### Rendering — CSS counters

`styles.css` additions (no color tokens; resolves against consumer shadcn):

```css
.vm-line-numbers {
  counter-reset: line;
}
.vm-line {
  counter-increment: line;
}
.vm-line::before {
  content: counter(line);
  display: inline-block;
  width: 1.5rem;
  margin-right: 1rem;
  text-align: right;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  opacity: 0.5;
  font-family: var(--vm-mono, ui-monospace, monospace);
  user-select: none;
}
```

**`HighlightedCodeBlockBody`** (`render/code-block/highlighted-body.tsx`):

- `<code>`: when `lineNumbers`, add class `vm-line-numbers`; set inline
  `style={{ "counter-reset": \`line ${startLine - 1}\` }}`when`startLine > 1`.
- Each line `<span>`: add class `vm-line` when `lineNumbers`.

**`CodeBlockBody`** (plain, `render/code-block/body.tsx`):

- Split `code` into lines; render `<For each={lines()}>` wrapping each line in
  `<span class="vm-line}>`. Empty line → render `"\n"` to preserve height.
- Same `<code>` counter-reset handling as above.
- When `lineNumbers === false`, render the current single-string `<code>{code}</code>`.

### Edge cases

- Streaming code (incomplete fence): plain body renders; numbers track partial
  lines — matches streamdown.
- Mermaid / custom renderers: bypassed (don't use these bodies).
- `startLine=0` or negative: guard `>= 1`, else treat as 1.
- Empty code block: no line spans, no numbers.

## Feature B: Streaming caret

### API

`VelomarkProps.caret?: "block" | "circle"` — opt-in (default `undefined` = off).
Export `type VelomarkCaret = "block" | "circle"`.

`CARET_CHARS = { block: " ▋", circle: " ●" }` (leading space, matching streamdown).

### Reactive state

Computed in the render layer (a small module or within `velomark.tsx`), reading
the reactive store:

1. `isStreaming = createMemo(() => document.blocks.some(b => b.status === "streaming"))`.
2. `hideCaret = createMemo(() => {
  const blocks = document.blocks;
  if (!isStreaming() || blocks.length === 0) return false;
  const last = blocks[blocks.length - 1];
  return last.status === "streaming" && (last.kind === "code" || last.kind === "table");
})`.
3. `showCaret = createMemo(() => props.caret && isStreaming() && !hideCaret())`.

### Rendering — CSS `::after`

Root container (`VelomarkView`'s `<div>`):

```tsx
<div
  class={cn("velomark space-y-4 ...", showCaret() && "vm-caret-root")}
  style={showCaret() ? { "--velomark-caret": `"${CARET_CHARS[props.caret!]}"` } : undefined}
>
  <For each={vm.blockIds}>...</For>
  {blocks.length === 0 && showCaret() && <span />}
  <FootnotesSection />
</div>
```

`styles.css` additions:

```css
.vm-caret-root > *:last-child::after {
  content: var(--velomark-caret);
  animation: vm-caret-blink 1s steps(2, start) infinite;
}
@keyframes vm-caret-blink {
  to {
    visibility: hidden;
  }
}
```

### Edge cases

- Nothing streaming → `isStreaming()` false → no caret. Correct (no static mode needed).
- Last block is a closed paragraph while an earlier block still streams → caret
  shows on the (complete) last block. Matches streamdown.
- Empty document while streaming → empty `<span>` provides `::after` target.
- Footnotes section: it is never `:last-child` while blocks exist; when blocks
  are empty the empty `<span>` precedes it, so the caret attaches to the span.

## Testing

### Line numbers

- Parser test: `meta` captured from fence (e.g. ` ```ts startLine=10 noLineNumbers ` →
  `language: "ts"`, `meta: "startLine=10 noLineNumbers"`).
- Unit: meta parse helpers (`startLine`, `noLineNumbers`).
- Render test: highlighted body renders `vm-line-numbers` + `vm-line` classes
  when enabled; omits when `lineNumbers=false` or `noLineNumbers` meta.
- Render test: plain body splits into line spans with counters.
- `startLine > 1` sets `counter-reset` inline style.

### Caret

- Render test: `caret="block"` + streaming paragraph → root has `vm-caret-root`
  - `--velomark-caret` var.
- Last streaming block is code/table → no `vm-caret-root` (hidden).
- Not streaming → no caret even if `caret` prop set.
- Empty document + streaming + caret → empty `<span>` rendered.

## Files touched

**Parser:**

- `lib/parser/context.ts` — `FENCE_RE` widened.
- `lib/parser/block-boundaries.ts` — `CodeBlockData.meta`; fence block stores meta.
- `lib/parser/__tests__/block-boundaries.test.ts` — meta capture assertion.

**Types / options:**

- `types.ts` — `VelomarkCodeBlockOptions.lineNumbers`; `VelomarkCaret`; `VelomarkProps.caret`, `VelomarkProps.lineNumbers`.
- `lib/velomark-context.tsx` — thread `lineNumbers`, `caret`; store fields.
- `render/velomark.tsx` — props; caret memos + root bindings.
- `index.tsx` — re-export `VelomarkCaret`.

**Code block rendering:**

- `render/code-block/index.tsx` — `CodeBlock` gains `lineNumbers`, `startLine`; `DEFAULT_CODE_BLOCK_OPTIONS`.
- `render/code-block/body.tsx` — plain body line splitting + counters.
- `render/code-block/highlighted-body.tsx` — counter classes.
- `render/blocks/code-block.tsx` — meta parse, resolve per-fence, pass through.

**Styles:**

- `styles.css` — `.vm-line-numbers`, `.vm-line`, `.vm-caret-root`, keyframes.

**Playground:**

- `dev/components/renderer-panel.tsx` — set `lineNumbers` (already default true) and `caret="block"` for visual testing.

**Tests:**

- New test files for line-number rendering and caret rendering.
