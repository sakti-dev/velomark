# RTL + isAnimating Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add RTL text-direction support (`dir` prop) and streaming-state observability (`isStreaming` context + `onAnimationStart`/`onAnimationEnd` callbacks) to velomark.

**Architecture:** Two independent features that touch the same files (`VelomarkProps`, `velomark-context.tsx`, `velomark.tsx`). RTL uses native HTML `dir="auto"` per text-block element — no JS direction detection. isAnimating exposes the existing `isStreaming` memo through context and fires transition callbacks via `createEffect`.

**Tech Stack:** SolidJS, TypeScript, vitest.

---

## Context for the Implementer

### Key files

| File                                                   | Role                                                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `packages/core/src/render/velomark.tsx`                | `VelomarkProps` interface, `VelomarkView` component, `isStreaming` memo lives here |
| `packages/core/src/lib/velomark-context.tsx`           | `VelomarkStore` interface, `VelomarkProvider`, `useVelomark()`                     |
| `packages/core/src/render/blocks/paragraph-block.tsx`  | `<p>` — needs `dir`                                                                |
| `packages/core/src/render/blocks/heading-block.tsx`    | `<Dynamic component="hN">` — needs `dir`                                           |
| `packages/core/src/render/blocks/blockquote-block.tsx` | `<blockquote>` — inner `<p>`s need `dir`                                           |
| `packages/core/src/render/blocks/list-block.tsx`       | `<ol>`/`<ul>` — `<li>` content needs `dir`                                         |
| `packages/core/src/lib/detect-direction.ts`            | Dead code — will be deleted                                                        |
| `packages/core/src/index.tsx`                          | Public exports                                                                     |

### Critical SolidJS behaviors

- **Component bodies run ONCE.** `if/else` branching is non-reactive. Use `<Switch>`/`<Match>` or conditionals inside props/attributes for reactive behavior.
- **`createMemo`** is lazy — only re-evaluates when read. **`createEffect`** is eager — runs immediately and re-runs on dependency change.
- **Attributes spread** with `{...obj}` are reactive if `obj` comes from a memo or getter.

### Testing conventions

- Tests are in `packages/core/src/render/__tests__/` and `packages/core/src/lib/__tests__/`.
- Use `solid-js/web`'s `render()` into a real DOM (`document.createElement("div")`).
- `vite-plus/test` provides `describe`, `expect`, `it`, `vi`.
- Run tests: `vp run --filter ./packages/core test`
- Run check: `vp check --fix`

### Existing `isStreaming` memo

Already implemented at `velomark.tsx:43`:

```ts
const isStreaming = createMemo(() => vm.document.blocks.some((b) => b.status === "streaming"));
```

Currently used only for caret logic. We will reuse it.

---

## Task 1: Add `dir` prop to `VelomarkProps` and thread to context

**Files:**

- Modify: `packages/core/src/render/velomark.tsx` (VelomarkProps interface, VelomarkView, Velomark)
- Modify: `packages/core/src/lib/velomark-context.tsx` (VelomarkStore, VelomarkProviderProps, store)
- Test: `packages/core/src/render/__tests__/rtl.test.tsx`

**Step 1: Write the failing test**

Create `packages/core/src/render/__tests__/rtl.test.tsx`:

```tsx
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

describe("RTL dir prop", () => {
  it("does not set dir when prop is absent", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark markdown={"Hello world"} />, host);
    mountedRoots.push(dispose);

    const root = host.querySelector("[data-velomark-root]")!;
    expect(root.getAttribute("dir")).toBeNull();
  });

  it("sets dir=auto on container when dir prop is auto", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark dir="auto" markdown={"Hello world"} />, host);
    mountedRoots.push(dispose);

    const root = host.querySelector("[data-velomark-root]")!;
    expect(root.getAttribute("dir")).toBe("auto");
  });

  it("sets dir on paragraph elements when dir is auto", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark dir="auto" markdown={"Hello\n\nשלום עולם"} />, host);
    mountedRoots.push(dispose);

    const paragraphs = host.querySelectorAll("p");
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(paragraphs[0]!.getAttribute("dir")).toBe("auto");
    expect(paragraphs[1]!.getAttribute("dir")).toBe("auto");
  });

  it("sets forced dir=rtl on all text blocks", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark dir="rtl" markdown={"# Heading\n\nParagraph"} />, host);
    mountedRoots.push(dispose);

    const heading = host.querySelector("h1")!;
    expect(heading.getAttribute("dir")).toBe("rtl");

    const paragraph = host.querySelector("p")!;
    expect(paragraph.getAttribute("dir")).toBe("rtl");
  });

  it("sets dir on heading elements", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark dir="auto" markdown={"# Title"} />, host);
    mountedRoots.push(dispose);

    const heading = host.querySelector("h1")!;
    expect(heading.getAttribute("dir")).toBe("auto");
  });

  it("sets dir on blockquote paragraphs", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark dir="auto" markdown={"> Quoted text"} />, host);
    mountedRoots.push(dispose);

    const quote = host.querySelector("blockquote p")!;
    expect(quote.getAttribute("dir")).toBe("auto");
  });

  it("sets dir on list items", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark dir="auto" markdown={"- item one\n- item two"} />, host);
    mountedRoots.push(dispose);

    const items = host.querySelectorAll("li");
    expect(items.length).toBe(2);
    for (const item of items) {
      expect(item.getAttribute("dir")).toBe("auto");
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `vp run --filter ./packages/core test`
Expected: FAIL — `dir` prop does not exist on `VelomarkProps`.

**Step 3: Add `dir` to `VelomarkProps`**

In `packages/core/src/render/velomark.tsx`, add to the `VelomarkProps` interface (after `debug?`):

```tsx
  dir?: "auto" | "ltr" | "rtl";
```

**Step 4: Add `dir` to context store**

In `packages/core/src/lib/velomark-context.tsx`:

Add to `VelomarkStore` interface:

```tsx
  dir?: "auto" | "ltr" | "rtl";
```

Add to `VelomarkProviderProps` interface:

```tsx
  dir?: "auto" | "ltr" | "rtl";
```

Add to the store object (after `debug`):

```tsx
    dir: props.dir,
```

**Step 5: Pass `dir` through `Velomark` → `VelomarkProvider`**

In `packages/core/src/render/velomark.tsx`, the `Velomark` function:

```tsx
export function Velomark(props: VelomarkProps) {
  return (
    <VelomarkProvider {...props}>
      <VelomarkView class={props.class} />
    </VelomarkProvider>
  );
}
```

Since `dir` is already on `VelomarkProps` and `VelomarkProviderProps`, the `{...props}` spread passes it through. No change needed here.

**Step 6: Apply `dir` to the container div**

In `VelomarkView`, add `dir={vm.dir}` to the root `<div>`:

```tsx
  return (
    <div
      ref={rootRef}
      class={cn(
        "velomark space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        props.class,
      )}
      data-velomark-root=""
      dir={vm.dir}
      style={caretStyle()}
    >
```

**Step 7: Run container-level tests**

Run: `vp run --filter ./packages/core test`
Expected: The "sets dir=auto on container" and "does not set dir when prop is absent" tests PASS. Per-block tests still FAIL.

**Step 8: Commit**

```bash
git add packages/core/src/render/velomark.tsx packages/core/src/lib/velomark-context.tsx packages/core/src/render/__tests__/rtl.test.tsx
git commit -m "feat(rtl): add dir prop to VelomarkProps and container"
```

---

## Task 2: Apply `dir` to text-bearing block components

**Files:**

- Modify: `packages/core/src/render/blocks/paragraph-block.tsx`
- Modify: `packages/core/src/render/blocks/heading-block.tsx`
- Modify: `packages/core/src/render/blocks/blockquote-block.tsx`
- Modify: `packages/core/src/render/blocks/list-block.tsx`

**Step 1: Add `dir` to ParagraphBlock**

In `packages/core/src/render/blocks/paragraph-block.tsx`, add `dir={vm.dir}` to the `<p>`:

```tsx
return (
  <p
    data-velomark-block-id={vm.debug ? block.id : undefined}
    data-velomark-block-index={index}
    data-velomark-block-kind={block.kind}
    data-velomark-incomplete={block.status === "streaming" ? "" : undefined}
    dir={vm.dir}
  >
    <RenderInline text={data().text} />
  </p>
);
```

**Step 2: Add `dir` to HeadingBlock**

In `packages/core/src/render/blocks/heading-block.tsx`, add `dir={vm.dir}` to the `<Dynamic>`:

```tsx
    <Dynamic
      class={cn(HEADING_CLASS[depth()])}
      component={`h${depth()}`}
      data-velomark-block-id={vm.debug ? block.id : undefined}
      data-velomark-block-index={index}
      data-velomark-block-kind={block.kind}
      data-velomark-incomplete={block.status === "streaming" ? "" : undefined}
      dir={vm.dir}
    >
```

**Step 3: Add `dir` to BlockquoteBlock**

In `packages/core/src/render/blocks/blockquote-block.tsx`, the inner `<p>` elements need `dir`. Add `dir={vm.dir}` to each inner `<p>`:

```tsx
<For each={data().paragraphs}>
  {(paragraph) => (
    <p dir={vm.dir}>
      <RenderInline text={paragraph} />
    </p>
  )}
</For>
```

Note: we put `dir` on the inner `<p>` elements, not the `<blockquote>` itself — the blockquote is structural; the text direction matters per-paragraph.

**Step 4: Add `dir` to ListBlock `<li>` elements**

In `packages/core/src/render/blocks/list-block.tsx`, the `<li>` elements contain text via `renderItemContent`. Add `dir={vm.dir}` to both `<li>` elements (ordered and unordered):

```tsx
if (data().ordered) {
  return (
    <ol {...commonProps} class={cn("list-inside list-decimal whitespace-normal [li_&]:pl-6")}>
      <For each={itemKeys()}>
        {(_key, itemIndex) => (
          <li class={cn("py-1 [&>p]:inline")} dir={vm.dir}>
            {renderItemContent(itemIndex())}
          </li>
        )}
      </For>
    </ol>
  );
}

return (
  <ul {...commonProps} class={cn("list-inside list-disc whitespace-normal [li_&]:pl-6")}>
    <For each={itemKeys()}>
      {(_key, itemIndex) => (
        <li class={cn("py-1 [&>p]:inline")} dir={vm.dir}>
          {renderItemContent(itemIndex())}
        </li>
      )}
    </For>
  </ul>
);
```

**Step 5: Run tests to verify they pass**

Run: `vp run --filter ./packages/core test`
Expected: All RTL tests PASS.

**Step 6: Run lint and typecheck**

Run: `vp check --fix`
Expected: No errors.

**Step 7: Commit**

```bash
git add packages/core/src/render/blocks/paragraph-block.tsx packages/core/src/render/blocks/heading-block.tsx packages/core/src/render/blocks/blockquote-block.tsx packages/core/src/render/blocks/list-block.tsx
git commit -m "feat(rtl): apply dir prop to text-bearing block components"
```

---

## Task 3: Delete `detectTextDirection` dead code

**Files:**

- Delete: `packages/core/src/lib/detect-direction.ts`
- Modify: `packages/core/src/index.tsx` (if it exports `detectTextDirection` — check first)

**Step 1: Verify `detectTextDirection` is unused**

Run a search to confirm no imports remain:

```bash
rg "detectTextDirection|detect-direction" packages/core/src/ --files-with-matches
```

Expected: Only `detect-direction.ts` itself (the definition). No imports anywhere.

**Step 2: Check if it's exported from index**

Check `packages/core/src/index.tsx` — it does NOT currently export `detectTextDirection`. No change needed to index.

**Step 3: Delete the file**

```bash
rm packages/core/src/lib/detect-direction.ts
```

**Step 4: Run tests and check**

Run: `vp run --filter ./packages/core test && vp check --fix`
Expected: All pass (the file was dead code).

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove unused detectTextDirection (replaced by native dir=auto)"
```

---

## Task 4: Expose `isStreaming` via context

**Files:**

- Modify: `packages/core/src/lib/velomark-context.tsx`
- Modify: `packages/core/src/render/velomark.tsx`
- Test: `packages/core/src/render/__tests__/is-streaming.test.tsx`

**Step 1: Write the failing test**

Create `packages/core/src/render/__tests__/is-streaming.test.tsx`:

````tsx
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { Velomark } from "../velomark";
import { useVelomark } from "../lib/velomark-context";

const mountedRoots: Array<() => void> = [];

afterEach(() => {
  while (mountedRoots.length > 0) {
    mountedRoots.pop()?.();
  }
  document.body.innerHTML = "";
});

// Test helper component that reads isStreaming from context
function StreamingProbe(props: { onValue: (v: boolean) => void }) {
  const vm = useVelomark();
  props.onValue(vm.isStreaming);
  return <></>;
}

describe("isStreaming context", () => {
  it("exposes false for complete markdown", () => {
    const host = document.createElement("div");
    document.body.append(host);
    let streamingValue: boolean | undefined;

    const dispose = render(
      () => (
        <>
          <Velomark markdown={"Hello world"}>
            <StreamingProbe onValue={(v) => (streamingValue = v)} />
          </Velomark>
          {/* fallback: render Velomark then check via effect */}
        </>
      ),
      host,
    );
    mountedRoots.push(dispose);

    // Velomark with no unclosed fences = not streaming
    expect(streamingValue).toBe(false);
  });

  it("exposes true for markdown with unclosed code fence", () => {
    const host = document.createElement("div");
    document.body.append(host);
    let streamingValue: boolean | undefined;

    const dispose = render(
      () => (
        <Velomark markdown={"```js\nconst x = 1"}>
          <StreamingProbe onValue={(v) => (streamingValue = v)} />
        </Velomark>
      ),
      host,
    );
    mountedRoots.push(dispose);

    expect(streamingValue).toBe(true);
  });

  it("transitions from true to false when fence closes", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const [md, setMd] = createSignal("```js\nconst x = 1");
    const values: boolean[] = [];

    const dispose = render(
      () => (
        <Velomark markdown={md()}>
          <StreamingProbe onValue={(v) => values.push(v)} />
        </Velomark>
      ),
      host,
    );
    mountedRoots.push(dispose);

    expect(values[values.length - 1]).toBe(true);

    setMd("```js\nconst x = 1\n```");
    await new Promise((r) => setTimeout(r, 10));

    expect(values[values.length - 1]).toBe(false);
  });
});
````

**Note on test design:** `Velomark` accepts `children` via `VelomarkProvider`. The `StreamingProbe` child renders inside the provider context and can call `useVelomark()`. We need to verify `VelomarkProps` accepts `children` — if not, add it.

**Step 2: Run test to verify it fails**

Run: `vp run --filter ./packages/core test`
Expected: FAIL — `vm.isStreaming` is undefined.

**Step 3: Add `children` support to VelomarkProps (if needed)**

Check if `VelomarkProps` has `children`. If not, in `packages/core/src/render/velomark.tsx`:

The `Velomark` component currently does:

```tsx
export function Velomark(props: VelomarkProps) {
  return (
    <VelomarkProvider {...props}>
      <VelomarkView class={props.class} />
    </VelomarkProvider>
  );
}
```

`VelomarkProvider` already accepts `children` (`VelomarkProviderProps` has `children: JSX.Element`). Since `{...props}` spreads everything, `children` flows through if present on `VelomarkProps`. Add `children?: JSX.Element` to `VelomarkProps` and render both children and view:

```tsx
export function Velomark(props: VelomarkProps) {
  return (
    <VelomarkProvider {...props}>
      {props.children}
      <VelomarkView class={props.class} />
    </VelomarkProvider>
  );
}
```

Add import for `JSX`:

```tsx
import { type JSX } from "solid-js";
```

Add to `VelomarkProps`:

```tsx
  children?: JSX.Element;
```

**Step 4: Add `isStreaming` to the context store**

The `isStreaming` memo currently lives inside `VelomarkView`. Move it to the store so context consumers can read it.

In `packages/core/src/lib/velomark-context.tsx`:

Add to `VelomarkStore` interface:

```tsx
isStreaming: () => boolean;
```

In `VelomarkProvider`, create the memo and add to store. Add imports:

```tsx
import { type JSX, createContext, createEffect, createMemo, useContext } from "solid-js";
```

Add after the `createEffect` block (before `const store`):

```tsx
const isStreaming = createMemo(() => document.blocks.some((b) => b.status === "streaming"));
```

Add to store object:

```tsx
    get isStreaming() {
      return isStreaming();
    },
```

**Step 5: Remove the duplicate memo from VelomarkView**

In `packages/core/src/render/velomark.tsx`, remove the `isStreaming` memo definition and read from context instead:

Replace:

```tsx
const isStreaming = createMemo(() => vm.document.blocks.some((b) => b.status === "streaming"));
```

with:

```tsx
const isStreaming = () => vm.isStreaming;
```

Or inline `vm.isStreaming` everywhere `isStreaming()` is used. The `hideCaret` and `showCaret` memos reference `isStreaming()` — keep them working by either keeping the local alias or inlining.

**Step 6: Run tests to verify they pass**

Run: `vp run --filter ./packages/core test`
Expected: All is-streaming tests PASS, plus existing caret tests still pass.

**Step 7: Run check**

Run: `vp check --fix`
Expected: No errors.

**Step 8: Commit**

```bash
git add packages/core/src/lib/velomark-context.tsx packages/core/src/render/velomark.tsx packages/core/src/render/__tests__/is-streaming.test.tsx
git commit -m "feat: expose isStreaming via VelomarkStore context"
```

---

## Task 5: Add `onAnimationStart` / `onAnimationEnd` callbacks

**Files:**

- Modify: `packages/core/src/render/velomark.tsx` (VelomarkProps interface, VelomarkView or Velomark)
- Modify: `packages/core/src/lib/velomark-context.tsx` (VelomarkProviderProps, store)
- Test: `packages/core/src/render/__tests__/is-streaming.test.tsx` (append to existing)

**Step 1: Write the failing test**

Append to `packages/core/src/render/__tests__/is-streaming.test.tsx`:

````tsx
import { vi } from "vite-plus/test";

describe("onAnimationStart / onAnimationEnd callbacks", () => {
  it("fires onAnimationStart when stream begins and onAnimationEnd when it completes", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const [md, setMd] = createSignal("");
    const onStart = vi.fn();
    const onEnd = vi.fn();

    const dispose = render(
      () => <Velomark markdown={md()} onAnimationStart={onStart} onAnimationEnd={onEnd} />,
      host,
    );
    mountedRoots.push(dispose);

    // Start with empty — not streaming
    await new Promise((r) => setTimeout(r, 10));
    expect(onStart).not.toHaveBeenCalled();

    // Begin streaming (unclosed fence)
    setMd("```js\nconst x");
    await new Promise((r) => setTimeout(r, 10));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();

    // Complete the fence
    setMd("```js\nconst x = 1\n```");
    await new Promise((r) => setTimeout(r, 10));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("does not fire duplicate callbacks when content grows mid-stream", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const [md, setMd] = createSignal("```js\nconst x");
    const onStart = vi.fn();
    const onEnd = vi.fn();

    const dispose = render(
      () => <Velomark markdown={md()} onAnimationStart={onStart} onAnimationEnd={onEnd} />,
      host,
    );
    mountedRoots.push(dispose);

    await new Promise((r) => setTimeout(r, 10));
    expect(onStart).toHaveBeenCalledTimes(1);

    // Still streaming — grow content
    setMd("```js\nconst x = 1;\nconst y");
    await new Promise((r) => setTimeout(r, 10));
    expect(onStart).toHaveBeenCalledTimes(1); // no duplicate
    expect(onEnd).not.toHaveBeenCalled();
  });
});
````

**Step 2: Run test to verify it fails**

Run: `vp run --filter ./packages/core test`
Expected: FAIL — `onAnimationStart`/`onAnimationEnd` don't exist on props.

**Step 3: Add callback props**

In `packages/core/src/render/velomark.tsx`, add to `VelomarkProps`:

```tsx
  onAnimationEnd?: () => void;
  onAnimationStart?: () => void;
```

In `packages/core/src/lib/velomark-context.tsx`, add to `VelomarkProviderProps`:

```tsx
  onAnimationEnd?: () => void;
  onAnimationStart?: () => void;
```

**Step 4: Fire callbacks via effect**

In `VelomarkProvider` (`velomark-context.tsx`), after the `isStreaming` memo, add an effect that fires the callbacks on transitions:

```tsx
let wasStreaming = false;
createEffect(() => {
  const now = isStreaming();
  if (now && !wasStreaming) {
    props.onAnimationStart?.();
  } else if (!now && wasStreaming) {
    props.onAnimationEnd?.();
  }
  wasStreaming = now;
});
```

**Note on reactivity:** `createEffect` tracks `isStreaming()` (a memo over `document.blocks`). When the store reconciles and any block's `status` flips to/from `"streaming"`, the memo re-evaluates and the effect fires. The `wasStreaming` boolean deduplicates — callbacks fire only on transitions, not on every content growth within the same streaming state.

**Step 5: Run tests to verify they pass**

Run: `vp run --filter ./packages/core test`
Expected: All callback tests PASS.

**Step 6: Run check**

Run: `vp check --fix`
Expected: No errors.

**Step 7: Commit**

```bash
git add packages/core/src/render/velomark.tsx packages/core/src/lib/velomark-context.tsx packages/core/src/render/__tests__/is-streaming.test.tsx
git commit -m "feat: add onAnimationStart/onAnimationEnd streaming callbacks"
```

---

## Task 6: Update ROADMAP and mark completed items

**Files:**

- Modify: `ROADMAP.md`

**Step 1: Update ROADMAP entries**

Mark these items as done:

- **#9 RTL text direction** → `[done]`, update description to reflect native `dir="auto"` approach
- **#6 isAnimating state** → `[done]`, update description to reflect context exposure + callbacks (no button disabling)
- **#16 Empty-footnote filtering** → `[done]`, note already implemented

Add to "Completed" section:

- RTL text direction via native `dir` prop
- isStreaming context + onAnimationStart/onAnimationEnd
- Empty-footnote filtering (already gated via `<Show>`)

Move to "Not Porting":

- **#15 normalizeHtmlIndentation** — velomark has no indented-code-block detection; lines are trimmed before pattern matching, so indented HTML already works
- **CJK plugin** — velomark's naive `indexOf` emphasis pairing already works for CJK; no autolink detection means no autolink-boundary problem

**Step 2: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: update ROADMAP — RTL, isAnimating done; CJK and normalizeHtmlIndentation not porting"
```

---

## Verification Checklist

After all tasks:

- [ ] `vp run --filter ./packages/core test` — all tests green (baseline 140 + new RTL + new isStreaming tests)
- [ ] `vp check --fix` — no lint/type/format errors
- [ ] `rg "detectTextDirection" packages/` — no results (dead code deleted)
- [ ] `rg "detect-direction" packages/` — no results
- [ ] Manual check in dev playground: `dir="auto"` on `<Velomark>` renders mixed LTR/RTL content correctly
- [ ] Manual check: streaming markdown fires `onAnimationStart` once at start, `onAnimationEnd` once at completion
