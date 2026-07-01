# Code-block line numbers + streaming caret — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add CSS-counter-based code-block line numbers (default ON, with `startLine`/`noLineNumbers` fence meta) and an opt-in streaming caret (`"block"`/`"circle"`) that renders inline at the end of the last streaming block.

**Architecture:** Both features are CSS-driven, mirroring streamdown exactly. Line numbers use CSS counters (`counter-reset` on `<code>`, `::before { content: counter(line) }` on each line span). The caret uses a reactive `--velomark-caret` CSS var bound on the root plus a `::after` pseudo-element with a blink keyframe. Fence meta is captured by widening `FENCE_RE` and stored on `CodeBlockData.meta`. The caret hides when the last block is an unclosed code fence or incomplete table, detected via parsed `status === "streaming"` (cleaner than streamdown's regex).

**Tech Stack:** SolidJS, TypeScript, `cnfast` (`cn`), CSS (no color tokens — resolves against consumer shadcn), `vite-plus/test`.

**Design doc:** `docs/plans/2026-07-02-line-numbers-and-caret-design.md`

**Verification commands:**

- Lint/format/typecheck: `vp check --fix`
- Tests (single filter): `vp run --filter ./packages/core test`
- Baseline before starting: 106 pass / 1 pre-existing fail (`streaming-edge-cases.test.tsx > keeps rendering stable while a fenced code block is unfinished`). Do NOT fix that pre-existing failure.

**Conventions:**

- No comments in code unless asked.
- DOM attrs use `data-velomark` prefix; CSS classes use `vm-` prefix.
- Use `cn` from `cnfast` for class composition.
- One commit per task. Do not push.
- Keep debug `console.log`s that already exist in other files untouched.

---

## Feature A: Code-block line numbers

### Task 1: Capture fence meta in the parser

**Files:**

- Modify: `packages/core/src/lib/parser/context.ts` (line 8 — `FENCE_RE`)
- Modify: `packages/core/src/lib/parser/block-boundaries.ts` (lines 50-53 `CodeBlockData`, lines 248-285 fence block)
- Test: `packages/core/src/lib/parser/__tests__/block-boundaries.test.ts`

**Step 1: Write the failing test**

Append to the `describe("parseBlockBoundaries", ...)` block in `block-boundaries.test.ts`, after the existing code-fence assertion (around line 58):

````tsx
it("captures the fence meta string after the language", () => {
  const blocks = parseBlockBoundaries(
    ["```ts startLine=10 noLineNumbers", "const x = 1;", "```"].join("\n"),
  );

  expect(blocks).toHaveLength(1);
  expect(blocks[0]?.kind).toBe("code");
  expect(blocks[0]?.data).toMatchObject({
    code: "const x = 1;",
    language: "ts",
    meta: "startLine=10 noLineNumbers",
  });
});

it("treats a fence line with only trailing whitespace as having no meta", () => {
  const blocks = parseBlockBoundaries(["```ts   ", "const x = 1;", "```"].join("\n"));

  expect(blocks[0]?.data).toMatchObject({
    language: "ts",
    meta: undefined,
  });
});
````

**Step 2: Run test to verify it fails**

Run: `vp run --filter ./packages/core test`
Expected: FAIL — `meta` is `undefined` (not captured) / `data` does not contain `meta`.

**Step 3: Implement**

In `packages/core/src/lib/parser/context.ts` line 8, replace:

````ts
const FENCE_RE = /^```([A-Za-z0-9_-]+)?\s*$/;
````

with:

````ts
const FENCE_RE = /^```([A-Za-z0-9_-]+)?(.*)$/;
````

In `packages/core/src/lib/parser/block-boundaries.ts`:

Update the `CodeBlockData` interface (lines 50-53):

```ts
export interface CodeBlockData {
  code: string;
  language?: string;
  meta?: string;
}
```

In the fence block construction (around lines 248-285), the language is `fenceMatch[1] || undefined`. Add meta capture right after `const language = fenceMatch[1] || undefined;`:

```ts
const language = fenceMatch[1] || undefined;
const rawMeta = fenceMatch[2]?.trim() || undefined;
const codeLines: string[] = [];
```

Then in the `data` object of the pushed block (around line 279-282), add `meta`:

```ts
        data: {
          code: codeLines.join("\n"),
          language,
          meta: rawMeta,
        },
```

**Step 4: Run test to verify it passes**

Run: `vp run --filter ./packages/core test`
Expected: PASS (the two new tests pass; all others unchanged).

**Step 5: Commit**

```bash
git add packages/core/src/lib/parser/context.ts packages/core/src/lib/parser/block-boundaries.ts packages/core/src/lib/parser/__tests__/block-boundaries.test.ts
git commit -m "feat(parser): capture fence meta string in CodeBlockData"
```

---

### Task 2: Add fence-meta parse helpers

**Files:**

- Create: `packages/core/src/render/code-block/fence-meta.ts`
- Test: `packages/core/src/render/code-block/__tests__/fence-meta.test.ts`

**Step 1: Write the failing test**

Create `packages/core/src/render/code-block/__tests__/fence-meta.test.ts`:

```ts
import { describe, expect, it } from "vite-plus/test";
import { parseCodeFenceMeta } from "../fence-meta";

describe("parseCodeFenceMeta", () => {
  it("returns defaults when meta is undefined", () => {
    expect(parseCodeFenceMeta(undefined)).toEqual({ lineNumbers: true, startLine: 1 });
  });

  it("detects noLineNumbers", () => {
    expect(parseCodeFenceMeta("noLineNumbers")).toEqual({ lineNumbers: false, startLine: 1 });
  });

  it("detects startLine=N", () => {
    expect(parseCodeFenceMeta("startLine=10")).toEqual({ lineNumbers: true, startLine: 10 });
  });

  it("parses both startLine and noLineNumbers together", () => {
    expect(parseCodeFenceMeta("startLine=10 noLineNumbers")).toEqual({
      lineNumbers: false,
      startLine: 10,
    });
  });

  it("clamps startLine below 1 to 1", () => {
    expect(parseCodeFenceMeta("startLine=0").startLine).toBe(1);
    expect(parseCodeFenceMeta("startLine=-5").startLine).toBe(1);
  });

  it("ignores startLine that is not a number", () => {
    expect(parseCodeFenceMeta("startLine=abc").startLine).toBe(1);
  });

  it("defaults lineNumbers to true for unrelated meta", () => {
    expect(parseCodeFenceMeta('title="example"').lineNumbers).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `vp run --filter ./packages/core test`
Expected: FAIL — `fence-meta.ts` does not exist / import fails.

**Step 3: Implement**

Create `packages/core/src/render/code-block/fence-meta.ts`:

```ts
const START_LINE_RE = /startLine=(\d+)/;
const NO_LINE_NUMBERS_RE = /\bnoLineNumbers\b/;

export interface ParsedFenceMeta {
  lineNumbers: boolean;
  startLine: number;
}

export function parseCodeFenceMeta(meta: string | undefined): ParsedFenceMeta {
  if (!meta) {
    return { lineNumbers: true, startLine: 1 };
  }

  const startLineMatch = START_LINE_RE.exec(meta);
  const parsedStartLine = startLineMatch ? Number.parseInt(startLineMatch[1] ?? "", 10) : undefined;
  const startLine = parsedStartLine !== undefined && parsedStartLine >= 1 ? parsedStartLine : 1;

  return {
    lineNumbers: !NO_LINE_NUMBERS_RE.test(meta),
    startLine,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `vp run --filter ./packages/core test`
Expected: PASS — all 7 new tests pass.

**Step 5: Commit**

```bash
git add packages/core/src/render/code-block/fence-meta.ts packages/core/src/render/code-block/__tests__/fence-meta.test.ts
git commit -m "feat(code-block): add fence-meta parse helpers for startLine/noLineNumbers"
```

---

### Task 3: Add `lineNumbers` option and thread it through

**Files:**

- Modify: `packages/core/src/types.ts` (`VelomarkCodeBlockOptions`, lines 138-146)
- Modify: `packages/core/src/render/code-block/index.tsx` (`DEFAULT_CODE_BLOCK_OPTIONS`, lines 23-31)
- Modify: `packages/core/src/render/velomark.tsx` (`VelomarkProps`, add `lineNumbers`)
- Modify: `packages/core/src/lib/velomark-context.tsx` (`VelomarkProviderProps`, `VelomarkStore`)
- Modify: `packages/core/src/render/blocks/code-block.tsx` (pass-through)
- Modify: `packages/core/src/render/code-block/index.tsx` (`CodeBlock` props)

**Step 1: Write the failing test**

Add to `packages/core/src/render/__tests__/render-blocks.test.tsx` (inside the existing top-level `describe`):

````tsx
it("renders line-number counter classes on highlighted code by default", () => {
  const host = document.createElement("div");
  document.body.append(host);

  const dispose = render(
    () => (
      <Velomark
        markdown={["```ts", "const x = 1;", "const y = 2;", "```"].join("\n")}
        plugins={{ code: mockCodePlugin }}
      />
    ),
    host,
  );
  mountedRoots.push(dispose);

  const code = host.querySelector("pre > code");
  expect(code?.classList.contains("vm-line-numbers")).toBe(true);
  const lineSpans = host.querySelectorAll("pre > code > span");
  expect(lineSpans).toHaveLength(2);
  expect(lineSpans[0]?.classList.contains("vm-line")).toBe(true);
});
````

**Step 2: Run test to verify it fails**

Run: `vp run --filter ./packages/core test`
Expected: FAIL — no `vm-line-numbers` / `vm-line` classes yet.

**Step 3: Implement**

In `packages/core/src/types.ts`, add `lineNumbers` to `VelomarkCodeBlockOptions` (lines 138-146):

```ts
export interface VelomarkCodeBlockOptions {
  copyButton?: boolean;
  defaultView?: "preview" | "source";
  downloadButton?: boolean;
  highlight?: boolean;
  highlightTheme?: string;
  languageLabel?: boolean;
  lineNumbers?: boolean;
  previewToggle?: boolean;
}
```

In `packages/core/src/render/code-block/index.tsx`:

- Add to `DEFAULT_CODE_BLOCK_OPTIONS` (lines 23-31) — `lineNumbers: true,` (keep alphabetical-ish order matching existing).
- Add `lineNumbers?: boolean;` and `startLine?: number;` to the `CodeBlockProps` type (around lines 40-55).
- Add `"lineNumbers"` and `"startLine"` to the `splitProps` keys list (around lines 63-74).
- Forward both to `CodeBlockBody` and `HighlightedCodeBlockBody` in the `<Show>` block (lines 102-111).

In `packages/core/src/render/velomark.tsx` `VelomarkProps` (lines 17-28), add:

```ts
  lineNumbers?: boolean;
```

In `packages/core/src/lib/velomark-context.tsx`:

- Add `lineNumbers?: boolean;` to `VelomarkProviderProps` (lines 35-46).
- Add `lineNumbers?: boolean;` to `VelomarkStore` (lines 20-33).
- In `VelomarkProvider`, set `lineNumbers: props.lineNumbers,` on the `store` object (around lines 74-99).

In `packages/core/src/render/blocks/code-block.tsx`, resolve per-fence options and pass through. Replace the `<CodeBlock ... />` JSX (lines 39-53) with:

```tsx
const fenceMeta = () => parseCodeFenceMeta(data().meta);
const showLineNumbers = () => options().lineNumbers && fenceMeta().lineNumbers;

return (
  <CodeBlock
    code={data().code}
    copyButton={options().copyButton}
    data-velomark-block-id={vm.debug ? block.id : undefined}
    data-velomark-block-index={index}
    data-velomark-block-kind={block.kind}
    data-velomark-incomplete={block.status === "streaming" ? "" : undefined}
    highlight={options().highlight}
    language={language()}
    languageLabel={options().languageLabel}
    codePlugin={codePlugin() ?? undefined}
    isIncomplete={block.status === "streaming"}
    lineNumbers={showLineNumbers()}
    startLine={fenceMeta().startLine}
  />
);
```

Add the import at the top: `import { parseCodeFenceMeta } from "../code-block/fence-meta";`

**Step 4: Run test to verify it fails differently (still red — bodies don't apply classes yet)**

Run: `vp run --filter ./packages/core test`
Expected: still FAIL on the new test (bodies don't render the classes yet) — this is expected; Tasks 5-6 add the classes. Other tests should still pass.

**Step 5: Commit (wiring is correct even though classes aren't applied yet)**

```bash
git add packages/core/src/types.ts packages/core/src/render/code-block/index.tsx packages/core/src/render/velomark.tsx packages/core/src/lib/velomark-context.tsx packages/core/src/render/blocks/code-block.tsx packages/core/src/render/__tests__/render-blocks.test.tsx
git commit -m "feat(code-block): thread lineNumbers option and per-fence meta to CodeBlock"
```

---

### Task 4: Add line-number CSS counters

**Files:**

- Modify: `packages/core/styles.css`

**Step 1: Implement (CSS — no unit test; verified via render tests in Tasks 5-6)**

Append to `packages/core/styles.css`:

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

**Step 2: Run check**

Run: `vp check --fix`
Expected: no errors.

**Step 3: Commit**

```bash
git add packages/core/styles.css
git commit -m "feat(styles): add vm-line-numbers CSS counter classes"
```

---

### Task 5: Apply counter classes in HighlightedCodeBlockBody

**Files:**

- Modify: `packages/core/src/render/code-block/highlighted-body.tsx`
- Modify: `packages/core/src/render/code-block/index.tsx` (forward to highlighted body)

**Step 1: Write the failing test** (the test from Task 3 covers this — `vm-line-numbers` + `vm-line` on highlighted output. Add one more for `startLine` and for `lineNumbers={false}`.)

Add to `packages/core/src/render/__tests__/render-blocks.test.tsx`:

````tsx
it("respects startLine meta by setting counter-reset on highlighted code", () => {
  const host = document.createElement("div");
  document.body.append(host);

  const dispose = render(
    () => (
      <Velomark
        markdown={["```ts startLine=10", "const x = 1;", "```"].join("\n")}
        plugins={{ code: mockCodePlugin }}
      />
    ),
    host,
  );
  mountedRoots.push(dispose);

  const code = host.querySelector("pre > code") as HTMLElement;
  expect(code.style.counterReset).toBe("line 9");
});

it("omits line-number classes when noLineNumbers meta is present", () => {
  const host = document.createElement("div");
  document.body.append(host);

  const dispose = render(
    () => (
      <Velomark
        markdown={["```ts noLineNumbers", "const x = 1;", "```"].join("\n")}
        plugins={{ code: mockCodePlugin }}
      />
    ),
    host,
  );
  mountedRoots.push(dispose);

  expect(host.querySelector("pre > code")?.classList.contains("vm-line-numbers")).toBe(false);
});
````

**Step 2: Run test to verify it fails**

Run: `vp run --filter ./packages/core test`
Expected: FAIL — no `counter-reset` style, classes still missing.

**Step 3: Implement**

In `packages/core/src/render/code-block/highlighted-body.tsx`:

Add `lineNumbers` and `startLine` to the props interface (lines 28-32):

```ts
export interface HighlightedCodeBlockBodyProps {
  code: string;
  language?: string;
  lineNumbers?: boolean;
  plugin: CodeHighlighterPlugin;
  startLine?: number;
}
```

Replace the `<code>` + line rendering (lines 67-81). The `<code>` element:

```tsx
<code
  class={cn(result() && "vm-code-highlighted", props.lineNumbers && "vm-line-numbers")}
  style={
    props.lineNumbers && props.startLine && props.startLine > 1
      ? { "counter-reset": `line ${props.startLine - 1}` }
      : undefined
  }
>
  <Show fallback={props.code} when={result()}>
    <For each={lines()}>
      {(line, lineIndex) => (
        <>
          <span class={cn(props.lineNumbers && "vm-line")}>
            <For each={line}>
              {(token) => <span style={buildTokenStyle(token)}>{token.content}</span>}
            </For>
          </span>
          <Show when={lineIndex() < lines().length - 1}>{"\n"}</Show>
        </>
      )}
    </For>
  </Show>
</code>
```

In `packages/core/src/render/code-block/index.tsx`, forward the props to `HighlightedCodeBlockBody` in the `<Show>` branch (lines 106-110):

```tsx
<HighlightedCodeBlockBody
  code={local.code}
  language={local.language}
  lineNumbers={local.lineNumbers}
  plugin={local.codePlugin as CodeHighlighterPlugin}
  startLine={local.startLine}
/>
```

**Step 4: Run test to verify it passes**

Run: `vp run --filter ./packages/core test`
Expected: PASS — the highlighted-body line-number tests pass (including the Task 3 test).

**Step 5: Commit**

```bash
git add packages/core/src/render/code-block/highlighted-body.tsx packages/core/src/render/code-block/index.tsx packages/core/src/render/__tests__/render-blocks.test.tsx
git commit -m "feat(code-block): apply line-number counters in highlighted body"
```

---

### Task 6: Apply counter classes in plain CodeBlockBody

**Files:**

- Modify: `packages/core/src/render/code-block/body.tsx`
- Modify: `packages/core/src/render/code-block/index.tsx` (forward to plain body fallback)

**Step 1: Write the failing test**

Add to `packages/core/src/render/__tests__/render-blocks.test.tsx`. This test uses NO code plugin so the plain body renders:

````tsx
it("renders line-number counter classes on plain (un-highlighted) code", () => {
  const host = document.createElement("div");
  document.body.append(host);

  const dispose = render(
    () => <Velomark markdown={["```", "line one", "line two", "```"].join("\n")} />,
    host,
  );
  mountedRoots.push(dispose);

  const code = host.querySelector("pre > code");
  expect(code?.classList.contains("vm-line-numbers")).toBe(true);
  const lineSpans = host.querySelectorAll("pre > code > span.vm-line");
  expect(lineSpans).toHaveLength(2);
  expect(lineSpans[0]?.textContent).toBe("line one");
});
````

**Step 2: Run test to verify it fails**

Run: `vp run --filter ./packages/core test`
Expected: FAIL — plain body renders a single text node, no spans.

**Step 3: Implement**

In `packages/core/src/render/code-block/body.tsx`, replace the whole file:

```tsx
import { type Component, type ComponentProps, For, Show, splitProps } from "solid-js";
import { cn } from "cnfast";

type CodeBlockBodyProps = ComponentProps<"div"> & {
  code: string;
  language?: string;
  lineNumbers?: boolean;
  startLine?: number;
};

export const CodeBlockBody: Component<CodeBlockBodyProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "code",
    "language",
    "lineNumbers",
    "startLine",
    "class",
    "children",
  ]);

  const lines = () => local.code.split("\n");

  return (
    <div
      {...rest}
      class={cn(
        "vm-code-body overflow-x-auto rounded-md border border-border bg-background p-4 text-sm",
        local.class,
      )}
      data-language={local.language}
    >
      <pre>
        <code
          class={local.lineNumbers ? "vm-line-numbers" : undefined}
          style={
            local.lineNumbers && local.startLine && local.startLine > 1
              ? { "counter-reset": `line ${local.startLine - 1}` }
              : undefined
          }
        >
          <Show when={local.lineNumbers} fallback={local.code}>
            <For each={lines()}>
              {(line, lineIndex) => (
                <>
                  <span class="vm-line">{line}</span>
                  <Show when={lineIndex() < lines().length - 1}>{"\n"}</Show>
                </>
              )}
            </For>
          </Show>
        </code>
      </pre>
    </div>
  );
};
```

In `packages/core/src/render/code-block/index.tsx`, forward the props to the plain `CodeBlockBody` fallback (line 104):

```tsx
          fallback={<CodeBlockBody code={local.code} language={local.language} lineNumbers={local.lineNumbers} startLine={local.startLine} />}
```

**Step 4: Run test to verify it passes**

Run: `vp run --filter ./packages/core test`
Expected: PASS — plain-body line-number test passes; all others unchanged.

**Step 5: Commit**

```bash
git add packages/core/src/render/code-block/body.tsx packages/core/src/render/code-block/index.tsx packages/core/src/render/__tests__/render-blocks.test.tsx
git commit -m "feat(code-block): apply line-number counters in plain body"
```

---

## Feature B: Streaming caret

### Task 7: Add `caret` prop and `VelomarkCaret` type

**Files:**

- Modify: `packages/core/src/render/velomark.tsx` (`VelomarkProps`, root bindings)
- Modify: `packages/core/src/lib/velomark-context.tsx` (store field)
- Modify: `packages/core/src/types.ts` (add `VelomarkCaret`)
- Modify: `packages/core/src/index.tsx` (re-export)

**Step 1: Write the failing test**

Create `packages/core/src/render/__tests__/caret.test.tsx`:

````tsx
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { Velomark } from "../velomark";

const mountedRoots: Array<() => void> = [];

afterEach(() => {
  while (mountedRoots.length > 0) {
    mountedRoots.pop()?.();
  }
  document.body.innerHTML = "";
});

describe("streaming caret", () => {
  it("renders the caret root class and CSS var when streaming and caret is set", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      // No closing fence => the paragraph block is "streaming"
      () => <Velomark markdown="Streaming text without" caret="block" />,
      host,
    );
    mountedRoots.push(dispose);

    const root = host.querySelector("[data-velomark-root]") as HTMLElement;
    expect(root.classList.contains("vm-caret-root")).toBe(true);
    expect(root.style.getPropertyValue("--velomark-caret")).toContain("▋");
  });

  it("does not render the caret when not streaming", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(() => <Velomark markdown="Complete paragraph.\n" caret="block" />, host);
    mountedRoots.push(dispose);

    const root = host.querySelector("[data-velomark-root]") as HTMLElement;
    expect(root.classList.contains("vm-caret-root")).toBe(false);
  });

  it("hides the caret when the last streaming block is an unclosed code fence", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      // Unclosed fence => code block is streaming
      () => <Velomark markdown={["```ts", "const x = 1;"].join("\n")} caret="block" />,
      host,
    );
    mountedRoots.push(dispose);

    const root = host.querySelector("[data-velomark-root]") as HTMLElement;
    expect(root.classList.contains("vm-caret-root")).toBe(false);
  });

  it("supports the circle caret style", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(() => <Velomark markdown="Streaming text" caret="circle" />, host);
    mountedRoots.push(dispose);

    const root = host.querySelector("[data-velomark-root]") as HTMLElement;
    expect(root.style.getPropertyValue("--velomark-caret")).toContain("●");
  });
});
````

**Step 2: Run test to verify it fails**

Run: `vp run --filter ./packages/core test`
Expected: FAIL — `caret` prop not accepted / no `vm-caret-root` class.

**Step 3: Implement**

In `packages/core/src/types.ts`, add (near the other exports, e.g. after `AnimateOptions`):

```ts
export type VelomarkCaret = "block" | "circle";
```

In `packages/core/src/render/velomark.tsx`:

- Add import of the type and `createMemo`.
- Add `caret?: VelomarkCaret;` to `VelomarkProps`.
- Replace the `VelomarkView` function (lines 30-50) with caret logic. Full replacement:

```tsx
const CARET_CHARS: Record<VelomarkCaret, string> = {
  block: " ▋",
  circle: " ●",
};

function VelomarkView(props: { class?: string }) {
  const vm = useVelomark();

  const isStreaming = createMemo(() => vm.document.blocks.some((b) => b.status === "streaming"));

  const hideCaret = createMemo(() => {
    const blocks = vm.document.blocks;
    if (!isStreaming() || blocks.length === 0) return false;
    const last = blocks[blocks.length - 1];
    if (!last) return false;
    return last.status === "streaming" && (last.kind === "code" || last.kind === "table");
  });

  const showCaret = createMemo(() => vm.caret && isStreaming() && !hideCaret());

  const caretStyle = createMemo(() => {
    const caret = vm.caret;
    if (!showCaret() || !caret) return undefined;
    return { "--velomark-caret": `"${CARET_CHARS[caret]}"` } as Record<string, string>;
  });

  return (
    <div
      class={cn(
        "velomark space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        showCaret() && "vm-caret-root",
        props.class,
      )}
      data-velomark-root=""
      style={caretStyle()}
    >
      <For each={vm.blockIds}>
        {(blockId, index) => (
          <BlockProvider blockId={blockId} index={index()}>
            <RenderBlockView />
          </BlockProvider>
        )}
      </For>
      {vm.document.blocks.length === 0 && showCaret() && <span />}
      <FootnotesSection />
    </div>
  );
}
```

Update imports at top of `velomark.tsx`: change `import { type Component, For } from "solid-js";` to `import { type Component, For, createMemo } from "solid-js";` and add `VelomarkCaret` to the type import from `../types`.

In `Velomark`, pass `caret` through to the provider and view:

```tsx
export function Velomark(props: VelomarkProps) {
  return (
    <VelomarkProvider {...props}>
      <VelomarkView class={props.class} />
    </VelomarkProvider>
  );
}
```

(The `caret` is already spread into the provider via `{...props}`. The view reads it from `vm.caret`.)

In `packages/core/src/lib/velomark-context.tsx`:

- Import `VelomarkCaret` from `../types`.
- Add `caret?: VelomarkCaret;` to `VelomarkProviderProps`.
- Add `caret?: VelomarkCaret;` to `VelomarkStore`.
- Set `caret: props.caret,` on the `store` object.

In `packages/core/src/index.tsx`, add `VelomarkCaret` to the type re-export from `./types`:

```ts
export type {
  InlineToken,
  RenderBlock,
  RenderDocument,
  VelomarkCaret,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
  VelomarkDebugMetrics,
} from "./types";
```

**Step 4: Run test to verify it fails differently** (CSS class is set but blink not yet — tests only check class + var, so they should pass once logic is in)

Run: `vp run --filter ./packages/core test`
Expected: FAIL on the caret tests only because `vm-caret-root` styling isn't there yet — actually the tests check the CLASS and VAR which Task 7 sets, so they should PASS now. If any fail, debug before continuing.

**Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/render/velomark.tsx packages/core/src/lib/velomark-context.tsx packages/core/src/index.tsx packages/core/src/render/__tests__/caret.test.tsx
git commit -m "feat(caret): add caret prop and reactive streaming-caret logic"
```

---

### Task 8: Add caret CSS (blink keyframe + `::after`)

**Files:**

- Modify: `packages/core/styles.css`

**Step 1: Implement**

Append to `packages/core/styles.css`:

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

**Step 2: Run check + the caret tests**

Run: `vp check --fix && vp run --filter ./packages/core test`
Expected: no lint errors; all caret tests pass.

**Step 3: Commit**

```bash
git add packages/core/styles.css
git commit -m "feat(styles): add vm-caret-root blink keyframe"
```

---

### Task 9: Enable both features in the playground

**Files:**

- Modify: `dev/components/renderer-panel.tsx`

**Step 1: Implement**

In `dev/components/renderer-panel.tsx` (lines 27-33), add `caret="block"`:

```tsx
<Velomark
  animated
  caret="block"
  debug={false}
  markdown={props.markdown}
  onDebugMetrics={props.onDebugMetrics}
  remend={{}}
/>
```

(`lineNumbers` defaults to `true`, so no need to pass it explicitly.)

**Step 2: Run check**

Run: `vp check --fix`
Expected: no errors.

**Step 3: Commit**

```bash
git add dev/components/renderer-panel.tsx
git commit -m "dev: enable streaming caret in playground"
```

---

### Task 10: Final verification + ROADMAP update

**Step 1: Full verification**

Run: `vp check --fix && vp run --filter ./packages/core test`
Expected: 0 lint/type errors; tests = 106 baseline + new tests all passing; the 1 pre-existing failure unchanged.

**Step 2: Update ROADMAP.md**

In `ROADMAP.md`:

- Change `### 1. [planned] Code-block line numbers + `startLine` meta` → `### 1. [done] Code-block line numbers + `startLine` meta` and collapse the scope bullets to a one-line summary referencing the commit.
- Change `### 4. [planned] Streaming caret indicator` → `### 4. [done] Streaming caret indicator` similarly.
- Add two entries to the `## Completed` section referencing the final commits.

**Step 3: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: mark line numbers and streaming caret as completed in ROADMAP"
```

---

## Done criteria

- [ ] `vp check --fix` is clean (0 errors/warnings).
- [ ] `vp run --filter ./packages/core test` passes all new tests; the 1 pre-existing failure is unchanged.
- [ ] Line numbers render by default on both plain and highlighted code; `noLineNumbers` meta hides them; `startLine=N` offsets them.
- [ ] Caret shows inline at the end of streaming text; hidden on unclosed code fences / incomplete tables; off when not streaming.
- [ ] Playground shows both features.
- [ ] ROADMAP.md updated; both items marked done.

## Notes for the executor

- The fenced-code-block regex change in Task 1 is also a latent bug fix: previously a fence line with trailing non-whitespace after the language (e.g. ` ```ts title="x" `) was NOT recognized as a fence at all. After the change it is. This is desirable.
- `incomplete-code-utils.ts` uses its own regex and is unaffected by the `FENCE_RE` change — do not touch it.
- The caret uses the parsed `block.status`/`block.kind` rather than streamdown's regex approach — this is an intentional, cleaner divergence noted in the design doc.
- If a test in `render-blocks.test.tsx` asserts exact `pre > code` text content (e.g. the existing `expect(host.querySelector("pre > code")?.textContent).toBe("const x = 1;")` on line 71), the plain-body change to per-line spans preserves `textContent` (spans concatenate to the same string), so it should remain green. Verify in Task 6 step 4.
