# Context Consolidation + Animation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate all document processing into unified VelomarkProvider + BlockProvider contexts, add token reconciliation via createStore + reconcile, and implement per-word streaming text animation.

**Architecture:** Extract state management from velomark.tsx into a VelomarkProvider (document store + config) and BlockProvider (per-block reactive state). Migrate all block components and RenderInline from prop drilling to context reads. Add createStore + reconcile to RenderInline for stable token references. Build AnimatedText component on top.

**Tech Stack:** SolidJS, solid-js/store (createStore, reconcile, unwrap), cnfast, CSS animations.

**Design doc:** `docs/plans/2026-07-01-context-consolidation-and-animation-design.md`

---

## Key patterns (apply to ALL tasks)

### Solid context is non-reactive for plain values

Solid's Context Provider sets `Owner.context[id]` inside `untrack()`. The value is captured once and never updates. To pass reactive values through context, store an **accessor function** `() => T` and call it inside the consumer's reactive scope.

```ts
// Provider — store accessor
const Ctx = createContext<() => Store>(() => fallback);
<Ctx.Provider value={() => reactiveValue}>

// Consumer — call accessor inside reactive scope
const value = useContext(Ctx)();
```

### createStore + reconcile for stable references

```ts
import { createStore, reconcile, unwrap } from "solid-js/store";

const [items, setItems] = createStore<T[]>([]);
createEffect(() => {
  setItems(reconcile(newItems, { key: null /* positional matching */ }));
});
```

`reconcile` diffs the new array against the store. Items at the same position keep their store proxy reference → `<For>` reuses their DOM instead of remounting.

### Verify command

Every task ends with:

```bash
vp check && vp run --filter ./packages/core test
```

Expected: 0 errors, 0 warnings, 96 pass / 1 pre-existing fail (`streaming-edge-cases > keeps rendering stable while a fenced code block is unfinished`).

---

## Phase 1: Create Context Providers

### Task 1: Create VelomarkContext

**Files:**

- Create: `packages/core/src/lib/velomark-context.tsx`

**Step 1: Create the context file**

```tsx
import { type JSX, createContext, createEffect, useContext } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { buildRenderDocument, collectRenderMetrics } from "./model/render-document";
import { hasIncompleteCodeFence } from "./incomplete-code-utils";
import type { PluginConfig } from "./plugin-types";
import type { ParsedBlockData } from "./parser/block-boundaries";
import type {
  AnimateOptions,
  ReferenceDefinitionMap,
  RenderBlock,
  RenderDocument,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
  VelomarkDebugMetrics,
} from "../types";
import type { Component } from "solid-js";

export interface VelomarkStore {
  plugins: PluginConfig;
  animationConfig: AnimateOptions | null;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug: boolean;
  document: RenderDocument<ParsedBlockData>;
  blockIds: string[];
  definitions: ReferenceDefinitionMap;
  footnoteDefinitions: Record<string, RenderBlock<ParsedBlockData>[]>;
  footnoteReferenceOrder: string[];
  docHasIncomplete: boolean;
}

export interface VelomarkProviderProps {
  animated?: boolean | AnimateOptions;
  children: JSX.Element;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  markdown: string;
  onDebugMetrics?: (metrics: VelomarkDebugMetrics) => void;
  plugins?: PluginConfig;
}

const VelomarkContext = createContext<VelomarkStore>();

export function useVelomark(): VelomarkStore {
  const ctx = useContext(VelomarkContext);
  if (!ctx) throw new Error("useVelomark must be used within a VelomarkProvider");
  return ctx;
}

function resolveAnimationConfig(animated?: boolean | AnimateOptions): AnimateOptions | null {
  if (!animated) return null;
  if (animated === true) return {};
  return animated;
}

export function VelomarkProvider(props: VelomarkProviderProps) {
  const [document, setDocument] = createStore<RenderDocument<ParsedBlockData>>(
    buildRenderDocument(undefined, props.markdown),
  );

  createEffect(() => {
    const previous = unwrap(document);
    const next = buildRenderDocument(previous, props.markdown);
    props.onDebugMetrics?.(collectRenderMetrics(previous.blocks, next.blocks));
    setDocument(reconcile(next, { key: "id" }));
  });

  const store: VelomarkStore = {
    plugins: props.plugins ?? {},
    animationConfig: resolveAnimationConfig(props.animated),
    codeBlockOptions: props.codeBlockOptions,
    codeBlockRenderers: props.codeBlockRenderers,
    containers: props.containers,
    debug: props.debug ?? false,
    get document() {
      return document;
    },
    get blockIds() {
      return document.blocks.map((b) => b.id);
    },
    get definitions() {
      return document.definitions;
    },
    get footnoteDefinitions() {
      return document.footnoteDefinitions;
    },
    get footnoteReferenceOrder() {
      return document.footnoteReferenceOrder;
    },
    get docHasIncomplete() {
      return hasIncompleteCodeFence(props.markdown);
    },
  };

  return <VelomarkContext.Provider value={store}>{props.children}</VelomarkContext.Provider>;
}

export { VelomarkContext };
```

**Note:** `AnimateOptions` type is referenced but not yet created. Create a placeholder in `types.ts` for now (Task 12 fills it out). Add to `packages/core/src/types.ts`:

```ts
export interface AnimateOptions {
  animation?: "fadeIn" | "blurIn" | "slideUp" | (string & {});
  duration?: number;
  easing?: string;
  sep?: "word" | "char";
  stagger?: number;
}
```

**Step 2: Verify**

```bash
vp check
```

Expected: 0 errors. The file is new, not yet imported anywhere.

**Step 3: Commit**

```bash
git add packages/core/src/lib/velomark-context.tsx packages/core/src/types.ts
git commit -m "feat: add VelomarkContext provider with document store + reconcile"
```

---

### Task 2: Create BlockContext

**Files:**

- Create: `packages/core/src/lib/block-context.tsx`

**Step 1: Create the context file**

```tsx
import { type JSX, createContext, createMemo, useContext } from "solid-js";
import type { ParsedBlockData } from "./parser/block-boundaries";
import type { RenderBlock, RenderBlockStatus } from "../types";
import { useVelomark } from "./velomark-context";

export interface BlockStore {
  block: RenderBlock<ParsedBlockData>;
  id: string;
  index: number;
  status: RenderBlockStatus;
  isStreaming: boolean;
  isCodeFenceIncomplete: boolean;
}

const BlockContext = createContext<() => BlockStore>();

export function useBlock(): BlockStore {
  const accessor = useContext(BlockContext);
  if (!accessor) throw new Error("useBlock must be used within a BlockProvider");
  return accessor();
}

export function BlockProvider(props: { blockId: string; index: number; children: JSX.Element }) {
  const vm = useVelomark();

  const block = createMemo(() => {
    const resolved = vm.document.blocks.find((b) => b.id === props.blockId);
    if (!resolved) throw new Error(`Missing block for id ${props.blockId}`);
    return resolved;
  });

  // Accessor pattern: context value is a function that returns the store.
  // Consumers call useBlock() which calls the accessor inside their reactive scope.
  const accessor = (): BlockStore => ({
    get block() {
      return block();
    },
    get id() {
      return props.blockId;
    },
    get index() {
      return props.index;
    },
    get status() {
      return block().status;
    },
    get isStreaming() {
      return block().status === "streaming";
    },
    get isCodeFenceIncomplete() {
      return block().status === "streaming" && vm.docHasIncomplete;
    },
  });

  return <BlockContext.Provider value={accessor}>{props.children}</BlockContext.Provider>;
}

export { BlockContext };
```

**Step 2: Verify**

```bash
vp check
```

**Step 3: Commit**

```bash
git add packages/core/src/lib/block-context.tsx
git commit -m "feat: add BlockContext provider for per-block reactive state"
```

---

## Phase 2: Wire Providers + Migrate Consumers

### Task 3: Wire VelomarkProvider + BlockProvider in velomark.tsx

This task adds the new providers alongside existing PluginProvider + BlockIncompleteContext. Both old and new contexts are available during migration.

**Files:**

- Modify: `packages/core/src/render/velomark.tsx`

**Step 1: Rewrite velomark.tsx**

Replace the entire file. The `<Velomark>` component becomes a thin wrapper. All state logic moves into `VelomarkProvider` (already created in Task 1).

```tsx
import { type Component, For } from "solid-js";
import { cn } from "cnfast";
import { BlockProvider } from "../lib/block-context";
import { VelomarkProvider } from "../lib/velomark-context";
import type { VelomarkCodeBlockRendererProps, VelomarkContainerRendererProps } from "../types";
import { FootnotesSection } from "./compat/footnotes/footnotes-section";
import { RenderBlockView } from "./render-block";
import { useVelomark } from "../lib/velomark-context";

export interface VelomarkProps {
  animated?: import("../types").AnimateOptions | boolean;
  class?: string;
  codeBlockOptions?: import("../types").VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  markdown: string;
  onDebugMetrics?: import("../types").VelomarkDebugMetrics extends never
    ? never
    : (metrics: import("../types").VelomarkDebugMetrics) => void;
  plugins?: import("../lib/plugin-types").PluginConfig;
}

function VelomarkView(props: { class?: string }) {
  const vm = useVelomark();
  return (
    <div
      class={cn(
        "velomark space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        props.class,
      )}
      data-velomark-root=""
    >
      <For each={vm.blockIds}>
        {(blockId, index) => (
          <BlockProvider blockId={blockId} index={index()}>
            <RenderBlockView />
          </BlockProvider>
        )}
      </For>
      <FootnotesSection />
    </div>
  );
}

export function Velomark(props: VelomarkProps) {
  return (
    <VelomarkProvider {...props}>
      <VelomarkView class={props.class} />
    </VelomarkProvider>
  );
}
```

**IMPORTANT:** The `VelomarkProps` type must stay compatible with the existing public API. Clean up the messy import types — use proper top-level imports. The `onDebugMetrics` type above is intentionally simplified; use clean imports in the actual implementation:

```tsx
import type { AnimateOptions, VelomarkCodeBlockOptions, VelomarkDebugMetrics } from "../types";
import type { PluginConfig } from "../lib/plugin-types";

export interface VelomarkProps {
  animated?: AnimateOptions | boolean;
  class?: string;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  markdown: string;
  onDebugMetrics?: (metrics: VelomarkDebugMetrics) => void;
  plugins?: PluginConfig;
}
```

**Step 2: Temporarily keep old contexts**

`RenderBlockView` still receives props (will be migrated in Task 6). It still renders `PluginProvider` internally if needed. For now, wrap with both:

Actually, since `VelomarkProvider` already provides `plugins` via context, and the old `PluginProvider` is still used by some consumers (code-block.tsx, math-view.tsx), we need to ALSO provide `PluginProvider` during migration. Add a temporary wrapper:

```tsx
// Temporary: provides old PluginContext during migration
import { PluginProvider } from "../lib/plugin-context";

export function Velomark(props: VelomarkProps) {
  return (
    <VelomarkProvider {...props}>
      <PluginProvider config={props.plugins ?? {}}>
        <VelomarkView class={props.class} />
      </PluginProvider>
    </VelomarkProvider>
  );
}
```

This ensures `usePlugins()` still works in components that haven't been migrated yet.

**Step 3: Migrate RenderBlockView temporarily**

`RenderBlockView` currently receives `block` as a prop. Since `BlockProvider` is now wrapping each block, `RenderBlockView` should read from `useBlock()`. But to keep the migration incremental, temporarily make `RenderBlockView` accept zero props and read everything from context.

Actually, this is a bigger change. Let me take a different approach: keep `RenderBlockView` signature as-is for now, but have `velomark.tsx` pass the block data from context. The `BlockProvider` stores the block, and we can have a temporary adapter.

Hmm, this is getting complex. Let me simplify the approach:

**Simplified migration strategy:** Don't change `RenderBlockView` or block component signatures yet. Instead:

1. `velomark.tsx` wraps everything in `VelomarkProvider` + `PluginProvider` (temporary)
2. `BlockProvider` wraps each block (provides `BlockContext`)
3. `RenderBlockView` still receives `block` prop — but now it reads it from `useBlock()` directly instead of from explicit props

Wait, that doesn't work either if `RenderBlockView` requires a `block` prop.

OK, cleanest approach for Task 3: **Rewrite velomark.tsx to use VelomarkProvider + BlockProvider, and update RenderBlockView to read from context.** This is a bigger task but avoids the awkward dual-context period.

**Revised Step 2: Rewrite velomark.tsx (clean version)**

```tsx
import { type Component, For } from "solid-js";
import { cn } from "cnfast";
import { BlockProvider, useBlock } from "../lib/block-context";
import { VelomarkProvider, useVelomark } from "../lib/velomark-context";
import type {
  AnimateOptions,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
  VelomarkDebugMetrics,
} from "../types";
import type { PluginConfig } from "../lib/plugin-types";
import { PluginProvider } from "../lib/plugin-context";
import { FootnotesSection } from "./compat/footnotes/footnotes-section";
import { RenderBlockView } from "./render-block";

export interface VelomarkProps {
  animated?: AnimateOptions | boolean;
  class?: string;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  markdown: string;
  onDebugMetrics?: (metrics: VelomarkDebugMetrics) => void;
  plugins?: PluginConfig;
}

function VelomarkView(props: { class?: string }) {
  const vm = useVelomark();
  return (
    <div
      class={cn(
        "velomark space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        props.class,
      )}
      data-velomark-root=""
    >
      <For each={vm.blockIds}>
        {(blockId, index) => (
          <BlockProvider blockId={blockId} index={index()}>
            <RenderBlockView />
          </BlockProvider>
        )}
      </For>
      <FootnotesSection />
    </div>
  );
}

export function Velomark(props: VelomarkProps) {
  return (
    <VelomarkProvider {...props}>
      <PluginProvider config={props.plugins ?? {}}>
        <VelomarkView class={props.class} />
      </PluginProvider>
    </VelomarkProvider>
  );
}
```

**Step 3: Update RenderBlockView to read from useBlock()**

`render-block.tsx` currently receives `block` + many props. Rewrite to read from context:

```tsx
import type { Component } from "solid-js";
import { useBlock } from "../lib/block-context";
import { useVelomark } from "../lib/velomark-context";
import type {
  BlockquoteBlockData,
  CodeBlockData,
  ContainerBlockData,
  HeadingBlockData,
  HtmlBlockData,
  HtmlElementBlockData,
  ListBlockData,
  MathBlockData,
  ParagraphBlockData,
  ParsedBlockData,
  TableBlockData,
} from "../lib/parser/block-boundaries";
import type { RenderBlock } from "../types";
import { BlockquoteBlock } from "./blocks/blockquote-block";
import { CodeBlockView } from "./blocks/code-block";
import { ContainerBlock } from "./blocks/container-block";
import { HeadingBlock } from "./blocks/heading-block";
import { HtmlBlock } from "./compat/html/html-block";
import { HtmlElementBlock } from "./compat/html/html-element-block";
import { ListBlock } from "./blocks/list-block";
import { MathBlock } from "./compat/math/math-block";
import { ParagraphBlock } from "./blocks/paragraph-block";
import { ThematicBreakBlock } from "./blocks/thematic-break-block";
import { Table } from "./table";

export const RenderBlockView: Component = () => {
  const { block } = useBlock();

  switch (block.kind) {
    case "paragraph":
      return <ParagraphBlock />;
    case "heading":
      return <HeadingBlock />;
    case "blockquote":
      return <BlockquoteBlock />;
    case "list":
      return <ListBlock />;
    case "code":
      return <CodeBlockView />;
    case "container":
      return <ContainerBlock />;
    case "html":
      return <HtmlBlock />;
    case "html-element":
      return <HtmlElementBlock />;
    case "math":
      return <MathBlock />;
    case "thematic-break":
      return <ThematicBreakBlock />;
    case "table":
      return <Table />;
    default:
      return <ParagraphBlock />;
  }
};
```

**IMPORTANT:** Each block component must also be updated to read from context (Task 4). If they still expect props, they'll break. So this task and Task 4 MUST be done together in the same commit.

**Step 4: Migrate ALL block components to read from context**

Each block component drops all props and reads from `useBlock()` + `useVelomark()`. See Task 4 for the full list and code.

**Step 5: Verify**

```bash
vp check && vp run --filter ./packages/core test
```

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: wire VelomarkProvider + BlockProvider, migrate RenderBlockView"
```

---

### Task 4: Migrate all block components to context

This task is done TOGETHER with Task 3 (same commit). All block components drop props and read from context.

**Files (all modify):**

- `packages/core/src/render/blocks/paragraph-block.tsx`
- `packages/core/src/render/blocks/heading-block.tsx`
- `packages/core/src/render/blocks/blockquote-block.tsx`
- `packages/core/src/render/blocks/list-block.tsx`
- `packages/core/src/render/blocks/thematic-break-block.tsx`
- `packages/core/src/render/blocks/code-block.tsx`
- `packages/core/src/render/blocks/container-block.tsx`
- `packages/core/src/render/table/index.tsx`
- `packages/core/src/render/compat/html/html-block.tsx`
- `packages/core/src/render/compat/html/html-element-block.tsx`
- `packages/core/src/render/compat/math/math-block.tsx`
- `packages/core/src/render/compat/footnotes/footnotes-section.tsx`

**Pattern for each component:**

1. Remove all props from the component signature: `Component` instead of `Component<Props>`
2. Call `const { block } = useBlock()` for block data
3. Call `const vm = useVelomark()` for config (containers, definitions, debug, etc.)
4. Replace `props.block` with `block.block` (the `block` from `useBlock()` returns a `BlockStore` where `.block` is the `RenderBlock`)
5. Replace `props.containers` with `vm.containers`
6. Replace `props.definitions` with `vm.definitions`
7. Replace `props.debug` with `vm.debug`
8. Replace `props.index` with `block.index`

**Example — paragraph-block.tsx (before):**

```tsx
export const ParagraphBlock: Component<{
  block: RenderBlock<ParagraphBlockData>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  definitions?: ReferenceDefinitionMap;
  index: number;
}> = (props) => { ... };
```

**Example — paragraph-block.tsx (after):**

```tsx
export const ParagraphBlock: Component = () => {
  const vm = useVelomark();
  const { block } = useBlock();
  const data = () => block.block.data as ParagraphBlockData;

  return (
    <p
      data-velomark-block-id={vm.debug ? block.id : undefined}
      data-velomark-block-index={block.index}
      data-velomark-block-kind={block.block.kind}
      data-velomark-incomplete={block.isStreaming ? "" : undefined}
    >
      <RenderInline text={data().text} />
    </p>
  );
};
```

**For RenderInline:** It now reads `containers` and `definitions` from `useVelomark()` internally (Task 5). The call becomes just `<RenderInline text={data().text} />`.

**For container-block.tsx (recursive):** Container children need their own `BlockProvider` wrapping:

```tsx
export const ContainerBlock: Component = () => {
  const vm = useVelomark();
  const { block } = useBlock();
  const data = () => block.block.data as ContainerBlockData;

  return (
    <div ...>
      <For each={data().children}>
        {(childBlock, index) => (
          <BlockProvider blockId={childBlock.id} index={index()}>
            <RenderBlockView />
          </BlockProvider>
        )}
      </For>
    </div>
  );
};
```

**Wait** — `ContainerBlockData.children` currently contains `RenderBlock[]`, not IDs. Check the actual type. If children are full block objects (not IDs), pass the block ID from `childBlock.id`.

**For list-block.tsx (recursive):** Same pattern. Nested list items that contain sub-lists render recursively. Each sub-list is a synthetic block — wrap in `BlockProvider` with the synthetic ID.

**For code-block.tsx (CodeBlockView):** Replace `usePlugins()` with `useVelomark().plugins`:

```tsx
export const CodeBlockView: Component = () => {
  const vm = useVelomark();
  const { block } = useBlock();
  const data = () => block.block.data as CodeBlockData;
  const plugins = () => vm.plugins;

  // ... rest of component using data() and plugins()
};
```

**For footnotes-section.tsx:** Reads from `useVelomark()`:

```tsx
export const FootnotesSection: Component = () => {
  const vm = useVelomark();
  // reads vm.footnoteDefinitions, vm.footnoteReferenceOrder, vm.definitions, etc.
};
```

**Verify + commit (together with Task 3 changes):**

```bash
vp check && vp run --filter ./packages/core test
git add -A
git commit -m "refactor: migrate all block components from prop drilling to context"
```

---

### Task 5: Migrate RenderInline to context + reconcile

**Files:**

- Modify: `packages/core/src/render/inline/render-inline.tsx`
- Modify: `packages/core/src/render/inline/inline-token-view.tsx`
- Modify: `packages/core/src/render/inline/__tests__/render-inline.test.tsx`

**Step 1: Rewrite render-inline.tsx with createStore + reconcile**

```tsx
import { type Component, createEffect } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { parseInline } from "../../lib/parser/inline-parser";
import { useVelomark } from "../../lib/velomark-context";
import type { InlineToken } from "../../types";
import { RenderInlineTokens } from "./inline-token-view";

export const RenderInline: Component<{ text?: string }> = (props) => {
  const vm = useVelomark();
  const [tokens, setTokens] = createStore<InlineToken[]>([]);

  createEffect(() => {
    const next = parseInline(props.text ?? "", vm.definitions);
    setTokens(reconcile(next, { key: null }));
  });

  return <RenderInlineTokens tokens={tokens} />;
};
```

**Step 2: Simplify inline-token-view.tsx**

`RenderInlineTokens` no longer receives `containers` or `definitions` as props — it reads from context. `renderInlineToken` also reads from context.

```tsx
import { type Component, type JSX, For } from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "cnfast";
import { useVelomark } from "../../lib/velomark-context";
// ... existing imports for HtmlElementView, ImageComponent, MathView, etc.

export const RenderInlineTokens: Component<{ tokens: InlineToken[] }> = (props) => {
  return <For each={props.tokens}>{(token) => renderInlineToken(token)}</For>;
};

export const renderInlineToken = (token: InlineToken): JSX.Element => {
  const vm = useVelomark();
  switch (token.type) {
    // ... all existing cases, but replace:
    //   props.containers → vm.containers
    //   props.definitions → vm.definitions
    // Same pattern for all cases that previously received these as parameters
    case "text":
      return token.text;
    // ... rest unchanged
  }
};
```

**IMPORTANT:** `renderInlineToken` previously took `containers` and `definitions` as parameters. Now it reads from context. Update ALL call sites — including recursive calls inside the function (e.g., `token.children.map((child) => renderInlineToken(child, ...))` becomes just `renderInlineToken(child)`).

**Step 3: Update render-inline tests**

Tests that used `<PluginProvider>` now need `<VelomarkProvider>`:

```tsx
// Before:
import { PluginProvider } from "../../../lib/plugin-context";

render(() => (
  <PluginProvider config={{ math: mockMathPlugin }}>
    <RenderInline text={...} definitions={...} />
  </PluginProvider>
), host);

// After:
import { VelomarkProvider } from "../../../lib/velomark-context";

render(() => (
  <VelomarkProvider markdown="" plugins={{ math: mockMathPlugin }}>
    <RenderInline text={...} />
  </VelomarkProvider>
), host);
```

Tests that passed `definitions` as a prop now put them in the markdown string or use `VelomarkProvider` with the appropriate markdown that produces those definitions. For reference-style link tests, pass the full markdown that includes the definition:

```tsx
// Before:
<RenderInline definitions={{ guide: { href: "..." } }} text="Open [docs][guide]" />

// After:
<VelomarkProvider markdown="[docs][guide]\n\n[guide]: https://example.com/guide">
  <RenderInline text="[docs][guide]" />
</VelomarkProvider>
```

**Note:** `RenderInline` reads `definitions` from `useVelomark()`, which parses them from the markdown passed to `VelomarkProvider`. For inline-only tests where you don't want to go through the full parser, you can create a helper that provides a pre-built store. But using `VelomarkProvider` is simpler and more realistic.

**Step 4: Verify**

```bash
vp check && vp run --filter ./packages/core test
```

**Step 5: Commit**

```bash
git add packages/core/src/render/inline/ packages/core/src/types.ts
git commit -m "refactor: migrate RenderInline to context + createStore/reconcile for tokens"
```

---

### Task 6: Migrate code-block skeleton gating

**Files:**

- Modify: `packages/core/src/render/code-block/index.tsx`

**Step 1: Replace `useIsCodeFenceIncomplete()` with `useBlock().isCodeFenceIncomplete`**

```tsx
// Before:
import { useIsCodeFenceIncomplete } from "../../lib/block-incomplete-context";
const isIncomplete = createMemo(() => useIsCodeFenceIncomplete());

// After:
import { useBlock } from "../../lib/block-context";
// Inside CodeBlock component:
const { isCodeFenceIncomplete } = useBlock();
const isIncomplete = createMemo(() => isCodeFenceIncomplete);
```

Actually, since `useBlock()` returns a snapshot object with getters, reading `.isCodeFenceIncomplete` inside a `createMemo` will track it reactively. Simpler:

```tsx
const block = useBlock();
// In the Show:
<Show when={!block.isCodeFenceIncomplete && showHighlighted()}>
```

**Step 2: Verify**

```bash
vp check && vp run --filter ./packages/core test
```

**Step 3: Commit**

```bash
git add packages/core/src/render/code-block/index.tsx
git commit -m "refactor: migrate code-block skeleton gating to useBlock()"
```

---

## Phase 3: Delete Old Contexts + Cleanup

### Task 7: Delete old contexts and clean up exports

**Files:**

- Delete: `packages/core/src/lib/plugin-context.tsx`
- Delete: `packages/core/src/lib/block-incomplete-context.ts`
- Modify: `packages/core/src/render/velomark.tsx` (remove temporary `PluginProvider` wrapper)
- Modify: `packages/core/src/index.tsx` (update exports)
- Modify: `packages/core/src/render/compat/math/math-view.tsx` (replace `usePlugins()` with `useVelomark().plugins`)

**Step 1: Migrate math-view.tsx**

```tsx
// Before:
import { usePlugins } from "../../../lib/plugin-context";
const plugins = usePlugins();

// After:
import { useVelomark } from "../../../lib/velomark-context";
const vm = useVelomark();
const plugins = () => vm.plugins;
```

**Step 2: Remove PluginProvider wrapper from velomark.tsx**

```tsx
// Before:
export function Velomark(props: VelomarkProps) {
  return (
    <VelomarkProvider {...props}>
      <PluginProvider config={props.plugins ?? {}}>
        <VelomarkView class={props.class} />
      </PluginProvider>
    </VelomarkProvider>
  );
}

// After:
export function Velomark(props: VelomarkProps) {
  return (
    <VelomarkProvider {...props}>
      <VelomarkView class={props.class} />
    </VelomarkProvider>
  );
}
```

**Step 3: Delete old context files**

```bash
rm packages/core/src/lib/plugin-context.tsx
rm packages/core/src/lib/block-incomplete-context.ts
```

**Step 4: Update index.tsx exports**

```tsx
// Remove:
export { PluginProvider, usePlugins } from "./lib/plugin-context";

// Add:
export { VelomarkProvider, useVelomark } from "./lib/velomark-context";
export { BlockProvider, useBlock } from "./lib/block-context";
export type { VelomarkStore } from "./lib/velomark-context";
export type { BlockStore } from "./lib/block-context";
export type { AnimateOptions } from "./types";
```

**Step 5: Verify**

```bash
vp check && vp run --filter ./packages/core test
```

Expected: No broken imports. All tests pass (same 96/1 baseline).

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: delete PluginContext + BlockIncompleteContext, consolidate into VelomarkContext"
```

---

## Phase 4: Animation System

### Task 8: Create animation utilities

**Files:**

- Create: `packages/core/src/lib/animation/split-text.ts`

**Step 1: Create split-text utilities**

Port streamdown's `splitByWord` and `splitByChar` verbatim (pure TypeScript):

```ts
const WHITESPACE_RE = /\s/;
const WHITESPACE_ONLY_RE = /^\s+$/;

export const splitIntoWords = (text: string): string[] => {
  const parts: string[] = [];
  let current = "";
  let inWhitespace = false;

  for (const char of text) {
    const isWs = WHITESPACE_RE.test(char);
    if (isWs !== inWhitespace && current) {
      parts.push(current);
      current = "";
    }
    current += char;
    inWhitespace = isWs;
  }

  if (current) {
    parts.push(current);
  }

  return parts;
};

export const splitIntoChars = (text: string): string[] => {
  const parts: string[] = [];
  let wsBuffer = "";

  for (const char of text) {
    if (WHITESPACE_RE.test(char)) {
      wsBuffer += char;
    } else {
      if (wsBuffer) {
        parts.push(wsBuffer);
        wsBuffer = "";
      }
      parts.push(char);
    }
  }

  if (wsBuffer) {
    parts.push(wsBuffer);
  }

  return parts;
};

export const isWhitespaceOnly = (text: string): boolean => WHITESPACE_ONLY_RE.test(text);
```

**Step 2: Verify + commit**

```bash
vp check
git add packages/core/src/lib/animation/split-text.ts
git commit -m "feat: add text splitting utilities for animation"
```

---

### Task 9: Add CSS keyframes

**Files:**

- Modify: `packages/core/styles.css`

**Step 1: Add keyframes + selector**

Append to `styles.css` (after the existing `@source` and `@import` lines):

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

**Step 2: Verify + commit**

```bash
vp check
git add packages/core/styles.css
git commit -m "feat: add streaming animation CSS keyframes"
```

---

### Task 10: Create AnimatedText component

**Files:**

- Create: `packages/core/src/render/inline/animated-text.tsx`

**Step 1: Create the component**

```tsx
import { type Component, createMemo, createEffect, For } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import type { AnimateOptions } from "../../types";
import { isWhitespaceOnly, splitIntoChars, splitIntoWords } from "../../lib/animation/split-text";

type ResolvedAnimateConfig = Required<AnimateOptions>;

const resolveConfig = (config: AnimateOptions): ResolvedAnimateConfig => ({
  animation: config.animation ?? "fadeIn",
  duration: config.duration ?? 150,
  easing: config.easing ?? "ease",
  sep: config.sep ?? "word",
  stagger: config.stagger ?? 40,
});

export const AnimatedText: Component<{ text: string; config: AnimateOptions }> = (props) => {
  const config = createMemo(() => resolveConfig(props.config));
  const [words, setWords] = createStore<string[]>([]);
  let prevWordCount = 0;

  createEffect(() => {
    const c = config();
    const next = c.sep === "char" ? splitIntoChars(props.text) : splitIntoWords(props.text);
    setWords(reconcile(next, { key: null }));
  });

  const wordMeta = createMemo(() => {
    const count = words.length;
    const meta: { isNew: boolean; delay: number }[] = [];
    for (let i = 0; i < count; i += 1) {
      const isNew = i >= prevWordCount;
      meta.push({
        isNew,
        delay: isNew ? (i - prevWordCount) * config().stagger : 0,
      });
    }
    prevWordCount = count;
    return meta;
  });

  return (
    <For each={words}>
      {(word, i) => {
        const m = wordMeta()[i()];
        return isWhitespaceOnly(word) ? (
          word
        ) : (
          <span
            data-velomark-animate
            style={{
              "--vm-animation": `vm-${config().animation}`,
              "--vm-duration": `${m.isNew ? config().duration : 0}ms`,
              "--vm-easing": config().easing,
              ...(m.delay > 0 ? { "--vm-delay": `${m.delay}ms` } : {}),
            }}
          >
            {word}
          </span>
        );
      }}
    </For>
  );
};
```

**Step 2: Verify + commit**

```bash
vp check
git add packages/core/src/render/inline/animated-text.tsx
git commit -m "feat: add AnimatedText component with word-level reconcile"
```

---

### Task 11: Wire animated prop + activation logic

**Files:**

- Modify: `packages/core/src/render/inline/inline-token-view.tsx`

**Step 1: Add animation check to `case "text"`**

In `renderInlineToken`, the `"text"` case checks animation config + streaming status:

```tsx
import { AnimatedText } from "./animated-text";
import { useBlock } from "../../lib/block-context";

// In the switch:
case "text": {
  const vm = useVelomark();
  if (vm.animationConfig) {
    const { isStreaming } = useBlock();
    if (isStreaming) {
      return <AnimatedText text={token.text} config={vm.animationConfig} />;
    }
  }
  return token.text;
}
```

**IMPORTANT:** `useBlock()` must be called within a component reactive scope, not inside a plain function. Since `renderInlineToken` is called inside `<For>` which is inside a component, `useContext` will resolve correctly. But `useBlock()` returns a snapshot — calling it multiple times is fine.

**CAUTION:** Calling hooks inside a `switch/case` that returns early can be problematic if the hook is conditional. In Solid, `useContext` is just a lookup — it's always safe to call. But to be clean, hoist the calls:

```tsx
export const renderInlineToken = (token: InlineToken): JSX.Element => {
  const vm = useVelomark();
  switch (token.type) {
    case "text": {
      if (vm.animationConfig) {
        const block = useBlock();
        if (block.isStreaming) {
          return <AnimatedText text={token.text} config={vm.animationConfig} />;
        }
      }
      return token.text;
    }
    // ... rest of cases using vm.containers, vm.definitions
  }
};
```

**Step 2: Verify in playground**

```bash
vp dev dev
```

Navigate to playground and test with `animated` prop:

```tsx
<Velomark markdown={streamingMarkdown} animated={{ animation: "blurIn", duration: 200 }} />
```

**Step 3: Run tests**

```bash
vp check && vp run --filter ./packages/core test
```

**Step 4: Commit**

```bash
git add packages/core/src/render/inline/inline-token-view.tsx packages/core/src/render/inline/animated-text.tsx
git commit -m "feat: wire streaming text animation into inline rendering"
```

---

## Dependency graph + execution order

```
Phase 1 (foundation, no existing code changes):
  Task 1: VelomarkContext     ← no deps
  Task 2: BlockContext        ← needs Task 1

Phase 2 (wire + migrate, MUST be done together):
  Task 3+4: Wire providers + migrate ALL block components + RenderBlockView
            ← needs Tasks 1+2
  Task 5: Migrate RenderInline + reconcile
          ← needs Task 3+4 (block components no longer pass containers/definitions props)
  Task 6: Migrate code-block skeleton gating
          ← needs Task 3+4

Phase 3 (cleanup):
  Task 7: Delete old contexts
          ← needs Tasks 3-6 all complete

Phase 4 (animation):
  Task 8: Split-text utilities     ← no deps
  Task 9: CSS keyframes            ← no deps
  Task 10: AnimatedText component  ← needs Task 8
  Task 11: Wire animated prop      ← needs Tasks 9+10 + Phase 2 complete
```

**Recommended execution:**

1. Tasks 1, 2 (sequential — create context files)
2. Tasks 3+4 (TOGETHER — wire providers + migrate all components, one big commit)
3. Task 5 (migrate RenderInline + reconcile)
4. Task 6 (migrate code-block gating)
5. Task 7 (delete old contexts + cleanup)
6. Tasks 8, 9 (parallel — utilities + CSS)
7. Task 10 (AnimatedText)
8. Task 11 (wire activation)

---

## Verification checklist (after all tasks)

- [ ] `vp check` — 0 errors, 0 warnings
- [ ] `vp run --filter ./packages/core test` — 96 pass / 1 pre-existing fail
- [ ] No imports from `plugin-context` or `block-incomplete-context` remain
- [ ] No block component receives props (all read from context)
- [ ] `RenderInline` uses `createStore` + `reconcile` (not memo)
- [ ] `AnimatedText` uses `reconcile` for word array
- [ ] CSS keyframes in `styles.css`
- [ ] `animated` prop on `<Velomark>` works in playground
- [ ] Animation spans stripped when block completes (inspect DOM)
- [ ] `index.tsx` exports `VelomarkProvider`, `useVelomark`, `BlockProvider`, `useBlock`, `AnimateOptions`
