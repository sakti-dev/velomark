# Context Consolidation + Streaming Text Animation — Design

## Overview

Two coupled changes:

1. **Context consolidation** — Extract all document processing state from `velomark.tsx` into a unified `VelomarkProvider` + `BlockProvider` context system. Eliminates prop drilling, ad-hoc contexts, and creates a clean foundation for future features.

2. **Token reconciliation** — Replace `parseInline()` in a memo (creates all-new objects every render) with `createStore` + `reconcile`. Preserves token references → `<For>` reuses DOM instead of remounting. Benefits ALL inline rendering.

3. **Streaming text animation** — Per-word fade/blur/slide-in animation during streaming, matching streamdown's `animated` prop. Zero DOM overhead in completed messages.

---

## Part 1: Context Consolidation

### Problem

The current architecture has no unified state. Everything is ad-hoc:

- `document` signal + derived memos live locally in `velomark.tsx` (67 lines of logic in a component that should just render)
- `PluginContext` carries plugins separately
- `BlockIncompleteContext` carries streaming+fence status separately
- Props `blockLookup`, `definitions`, `docHasIncomplete`, `codeBlockOptions`, `containers`, `codeBlockRenderers`, `debug` are manually threaded through `BlockSlot` → `RenderBlockView` → block components → `RenderInline`
- Adding any new feature (like animation) means adding another context AND another prop chain

The prop drilling chain for inline-bearing blocks alone involves 5+ props passed through 3 layers:

```
Velomark → BlockSlot → RenderBlockView → ParagraphBlock → RenderInline
         (blockLookup, definitions, docHasIncomplete, containers, debug, index)
```

### Solution: Two contexts

#### `VelomarkProvider` + `useVelomark()` — document-level

**File:** `src/lib/velomark-context.tsx`

Carries all document-level state: static config (set once from props) + reactive document store.

```ts
interface VelomarkStore {
  // Static config (from VelomarkProps)
  plugins: PluginConfig;
  animationConfig: AnimateOptions | null;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug: boolean;

  // Reactive document state (store)
  document: RenderDocument<ParsedBlockData>;
  blockIds: string[];
  definitions: ReferenceDefinitionMap;
  footnoteDefinitions: Record<string, RenderBlock<ParsedBlockData>[]>;
  footnoteReferenceOrder: string[];
  docHasIncomplete: boolean;
}
```

**Provider implementation:**

```tsx
export function VelomarkProvider(props: VelomarkProps & { children: JSX.Element }) {
  const [document, setDocument] = createStore<RenderDocument<ParsedBlockData>>(
    buildRenderDocument(undefined, props.markdown),
  );

  createEffect(() => {
    const previous = unwrap(document);
    const next = buildRenderDocument(previous, props.markdown);
    props.onDebugMetrics?.(collectRenderMetrics(previous.blocks, next.blocks));
    setDocument(reconcile(next, { key: "id" }));
  });

  const store = {
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
```

**Key details:**

- `createStore` + `reconcile({ key: "id" })` matches blocks by their stable ID. Unchanged blocks keep their store proxy reference → fine-grained reactivity (components reading `block.data.text` only update when that text changes).
- `unwrap(document)` is needed because `buildRenderDocument` compares previous blocks by reference (`canReuseBlock`), and store proxies would interfere with referential equality checks.
- Static config fields (plugins, animationConfig, etc.) are plain values. Reactive fields use getters that read from the store.
- The context value is a plain object (not an accessor). This works because Solid's Context Provider captures the value inside `untrack()` — but since the getters read from the store reactively, consumers that access them inside reactive scopes track the store signals.

#### `BlockProvider` + `useBlock()` — block-level

**File:** `src/lib/block-context.tsx`

Carries per-block reactive state. Replaces `BlockIncompleteContext`.

```ts
interface BlockStore {
  block: RenderBlock<ParsedBlockData>;
  id: string;
  index: number;
  status: RenderBlockStatus;
  isStreaming: boolean;
  isCodeFenceIncomplete: boolean; // status === "streaming" && docHasIncomplete
}
```

**Provider implementation:**

```tsx
export function BlockProvider(props: { blockId: string; index: number; children: JSX.Element }) {
  const vm = useVelomark();
  const block = createMemo(() => {
    const resolved = vm.document.blocks.find((b) => b.id === props.blockId);
    if (!resolved) throw new Error(`Missing block for id ${props.blockId}`);
    return resolved;
  });

  // Accessor pattern for reactive fields (Solid context is non-reactive for plain values)
  const store: () => BlockStore = () => ({
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

  return <BlockContext.Provider value={store}>{props.children}</BlockContext.Provider>;
}

export const useBlock = (): BlockStore => useContext(BlockContext)();
```

**Note on accessor pattern:** Like `BlockIncompleteContext`, the context value is `() => BlockStore` (a function). Consumers call `useContext(BlockContext)()` to get the store, and then access getters that read reactive values. This is required because Solid's Context Provider captures the value inside `untrack()`.

### What gets eliminated

| Before                                                            | After                                           |
| ----------------------------------------------------------------- | ----------------------------------------------- |
| `PluginContext` + `PluginProvider` (`src/lib/plugin-context.tsx`) | `VelomarkStore.plugins`                         |
| `BlockIncompleteContext` (`src/lib/block-incomplete-context.ts`)  | `BlockStore.isCodeFenceIncomplete`              |
| `useIsCodeFenceIncomplete()`                                      | `useBlock().isCodeFenceIncomplete`              |
| `usePlugins()`                                                    | `useVelomark().plugins`                         |
| Prop drilling: `blockLookup`                                      | Read `vm.document.blocks` directly              |
| Prop drilling: `definitions`                                      | `vm.definitions`                                |
| Prop drilling: `containers`                                       | `vm.containers`                                 |
| Prop drilling: `codeBlockOptions` / `codeBlockRenderers`          | `vm.codeBlockOptions` / `vm.codeBlockRenderers` |
| Prop drilling: `debug`                                            | `vm.debug`                                      |
| Prop drilling: `index`                                            | `useBlock().index`                              |
| `document` signal + memos in `velomark.tsx`                       | Inside `VelomarkProvider`                       |

### What `<Velomark>` becomes

```tsx
export function Velomark(props: VelomarkProps) {
  return (
    <VelomarkProvider {...props}>
      <VelomarkView class={props.class} />
    </VelomarkProvider>
  );
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
```

### What block components become

**Before** (`paragraph-block.tsx`):

```tsx
export const ParagraphBlock: Component<{
  block: RenderBlock<ParagraphBlockData>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  definitions?: ReferenceDefinitionMap;
  index: number;
}> = (props) => {
  return (
    <p data-velomark-block-id={props.debug ? props.block.id : undefined} ...>
      <RenderInline containers={props.containers} definitions={props.definitions} text={props.block.data.text} />
    </p>
  );
};
```

**After:**

```tsx
export const ParagraphBlock: Component = () => {
  const vm = useVelomark();
  const block = useBlock();
  return (
    <p data-velomark-block-id={vm.debug ? block.id : undefined} ...>
      <RenderInline text={block.block.data.text} />
    </p>
  );
};
```

No props (except the block data, which comes from context). `RenderInline` reads `containers` and `definitions` from `useVelomark()` internally.

### Recursive blocks (ContainerBlock, ListBlock)

Currently, `ContainerBlock` calls `<RenderBlockView>` for child blocks, re-threading all props. With context:

```tsx
// ContainerBlock
<For each={childBlockIds()}>
  {(childId, index) => (
    <BlockProvider blockId={childId} index={index()}>
      <RenderBlockView />
    </BlockProvider>
  )}
</For>
```

No prop threading needed. Each child gets its own `BlockProvider` wrapping. `ListBlock` recursion works the same way.

---

## Part 2: Token Reconciliation

### Problem

`RenderInline` calls `parseInline()` in a memo:

```tsx
const tokens = () => parseInline(props.text ?? "", props.definitions);
```

Every time `props.text` changes (every streaming token), `parseInline()` creates entirely new token objects. `<For>` compares by reference → sees all-new objects → remounts ALL token DOM on every text change. This causes unnecessary DOM churn and would break animation (remounted spans re-animate).

### Solution

Replace the memo with `createStore` + `reconcile`:

```tsx
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

With `key: null`, `reconcile` matches by position. When "Hello" grows to "Hello world":

- Index 0: `{ type: "text", text: "Hello" }` → `{ type: "text", text: "Hello world" }` — same position, token proxy preserved, `.text` property updated reactively
- `<For>` sees the same item reference → reuses DOM → no remount

This benefits ALL inline rendering: smoother streaming, less DOM churn, preserves text selection and focus state.

### `RenderInlineTokens` simplification

Currently receives `containers` and `definitions` as props. After context consolidation, it reads them from `useVelomark()` directly. Only `tokens` remains as a prop (the store array).

```tsx
export const RenderInlineTokens: Component<{ tokens: InlineToken[] }> = (props) => {
  return (
    <For each={props.tokens}>
      {(token) => renderInlineToken(token, useVelomark().containers, useVelomark().definitions)}
    </For>
  );
};
```

---

## Part 3: Streaming Text Animation

### Activation

Opt-in via `animated` prop on `<Velomark>`:

```tsx
<Velomark markdown={md} animated />                             // defaults
<Velomark markdown={md} animated={{ animation: "blurIn", duration: 200 }} />  // custom
```

Type on `VelomarkProps`:

```ts
animated?: boolean | AnimateOptions;
```

The config is resolved once in `VelomarkProvider` and stored in `VelomarkStore.animationConfig`.

### Animation options

```ts
interface AnimateOptions {
  animation?: "fadeIn" | "blurIn" | "slideUp" | (string & {});
  duration?: number; // default 150 (ms)
  easing?: string; // default "ease"
  sep?: "word" | "char"; // default "word"
  stagger?: number; // default 40 (ms between new items in a batch)
}
```

### How it works

When animation is enabled AND the block is streaming, the `"text"` case in `renderInlineToken` renders `<AnimatedText>` instead of returning a raw string:

```tsx
case "text": {
  const vm = useVelomark();
  const block = useBlock();
  if (vm.animationConfig && block.isStreaming) {
    return <AnimatedText text={token.text} config={vm.animationConfig} />;
  }
  return token.text;
}
```

When `block.isStreaming` becomes false (block completes), the reactive scope re-runs → `renderInlineToken` returns plain `token.text` → Solid disposes `<AnimatedText>` and all its spans → **zero DOM overhead** in finished messages.

### `AnimatedText` component

**File:** `src/render/inline/animated-text.tsx`

```tsx
export const AnimatedText: Component<{ text: string; config: AnimateConfig }> = (props) => {
  const [words, setWords] = createStore<string[]>([]);
  let prevWordCount = 0;

  createEffect(() => {
    const next =
      props.config.sep === "char" ? splitIntoChars(props.text) : splitIntoWords(props.text);
    setWords(reconcile(next, { key: null }));
  });

  // Compute per-word metadata: which words are new, their stagger delay
  const wordMeta = createMemo(() => {
    const count = words.length;
    const meta: { isNew: boolean; delay: number }[] = [];
    for (let i = 0; i < count; i++) {
      const isNew = i >= prevWordCount;
      meta.push({
        isNew,
        delay: isNew ? (i - prevWordCount) * props.config.stagger : 0,
      });
    }
    prevWordCount = count;
    return meta;
  });

  return (
    <For each={words}>
      {(word, i) => {
        const m = wordMeta[i()];
        return WHITESPACE_RE.test(word) ? (
          word
        ) : (
          <span
            data-velomark-animate
            style={{
              "--vm-animation": `vm-${props.config.animation}`,
              "--vm-duration": `${m.isNew ? props.config.duration : 0}ms`,
              "--vm-easing": props.config.easing,
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

**How `reconcile` prevents re-animation:**

1. Text grows from `"Hello"` to `"Hello world"`
2. `splitIntoWords` produces `["Hello", " ", "world"]`
3. `reconcile(["Hello", " ", "world"], { key: null })` diffs against store
4. Index 0 (`"Hello"`) matches → store proxy preserved → `<For>` reuses span → **no remount → no re-animation**
5. Indices 1-2 are new → `<For>` mounts new spans → **CSS animation fires**
6. `prevWordCount` tracks word count across updates (persists because component isn't remounted thanks to token reconciliation)
7. New words get incremental stagger delays: first new word delay=0, second delay=40ms, etc.

**`duration:0` for old words:** Even though `reconcile` preserves span references, the style attribute is reactive. Old words get `--vm-duration:0ms` (updated from `wordMeta`). This is a safety net — if anything causes a remount, old words appear instantly.

### Text splitting utilities

**File:** `src/lib/animation/split-text.ts`

Port streamdown's `splitByWord` and `splitByChar` functions verbatim (pure TypeScript, no deps).

### Skip tags

Animation skips text inside `<code>`, `<pre>`, `<svg>`, `<math>`, `<annotation>`. In velomark, these are separate inline token types (`case "code"` returns `<code>` element, math is `case "inline-math"`). The skip is automatic — only `case "text"` tokens get animated. No special logic needed.

---

## Part 4: CSS

**File:** `packages/core/styles.css`

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

Naming convention: `vm-` prefix (not `sd-`) to match velomark's `data-velomark` convention. Custom animations use `vm-<name>` keyframes.

---

## Part 5: Files Changed

### New files

| File                                  | Purpose                                                       |
| ------------------------------------- | ------------------------------------------------------------- |
| `src/lib/velomark-context.tsx`        | `VelomarkProvider`, `useVelomark()`, `VelomarkStore`          |
| `src/lib/block-context.tsx`           | `BlockProvider`, `useBlock()`, `BlockStore`                   |
| `src/lib/animation/types.ts`          | `AnimateOptions`, `AnimateConfig`, `resolveAnimationConfig()` |
| `src/lib/animation/split-text.ts`     | `splitIntoWords()`, `splitIntoChars()`                        |
| `src/render/inline/animated-text.tsx` | `AnimatedText` component                                      |

### Modified files

| File                                                | Changes                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/render/velomark.tsx`                           | Thin wrapper: `<VelomarkProvider><VelomarkView/></VelomarkProvider>`. All state logic extracted. |
| `src/render/render-block.tsx`                       | `RenderBlockView` reads block from `useBlock()` instead of props. No more prop switch.           |
| `src/render/blocks/paragraph-block.tsx`             | Read from context, drop props                                                                    |
| `src/render/blocks/heading-block.tsx`               | Read from context, drop props                                                                    |
| `src/render/blocks/blockquote-block.tsx`            | Read from context, drop props                                                                    |
| `src/render/blocks/list-block.tsx`                  | Read from context, drop props                                                                    |
| `src/render/blocks/code-block.tsx`                  | Read from context, drop props                                                                    |
| `src/render/blocks/container-block.tsx`             | Read from context, drop props                                                                    |
| `src/render/blocks/thematic-break-block.tsx`        | Read from context, drop props                                                                    |
| `src/render/blocks/fallback-block.tsx`              | Read from context (if exists)                                                                    |
| `src/render/inline/render-inline.tsx`               | `createStore` + `reconcile` for tokens; read `definitions`/`containers` from context             |
| `src/render/inline/inline-token-view.tsx`           | Read `containers`/`definitions` from context; `case "text"` → `<AnimatedText>` when active       |
| `src/render/table/index.tsx`                        | Read from context, drop props                                                                    |
| `src/render/compat/footnotes/footnotes-section.tsx` | Read from context, drop props                                                                    |
| `src/render/compat/html/html-block.tsx`             | Read from context                                                                                |
| `src/render/compat/html/html-element-block.tsx`     | Read from context                                                                                |
| `src/render/compat/math/math-block.tsx`             | Read from context                                                                                |
| `src/render/code-block/index.tsx`                   | Replace `useIsCodeFenceIncomplete()` with `useBlock().isCodeFenceIncomplete`                     |
| `src/types.ts`                                      | Add `animated?: boolean \| AnimateOptions` to `VelomarkProps`                                    |
| `src/index.tsx`                                     | Export `AnimateOptions`, `VelomarkProvider`, `useVelomark`, `BlockProvider`, `useBlock`          |
| `styles.css`                                        | Add keyframes + `[data-velomark-animate]` selector                                               |

### Deleted files

| File                                  | Replaced by                        |
| ------------------------------------- | ---------------------------------- |
| `src/lib/plugin-context.tsx`          | `VelomarkStore.plugins`            |
| `src/lib/block-incomplete-context.ts` | `BlockStore.isCodeFenceIncomplete` |

---

## Part 6: Migration Safety

### Backward compatibility

- `<Velomark>` public API stays the same: same props, same default behavior. `animated` is optional (undefined = off).
- Consumers who don't use `animated` see no change.
- Internal context refactoring is invisible to consumers (they don't import `PluginContext` or `BlockIncompleteContext` directly — those are internal).

### Test impact

- Existing tests render `<Velomark markdown={...} />` — the public API doesn't change.
- `streaming-edge-cases.test.tsx` — test 2 modification (skeleton during streaming) stays correct.
- `dom-identity.test.tsx` — DOM identity preservation improves with reconcile (blocks/tokens keep references).
- Code-block tests that mock plugins via `PluginProvider` would need updating (use `plugins` prop on `<Velomark>` instead, or use `VelomarkProvider` directly).

### Execution order

1. **Context consolidation** — Create `VelomarkProvider` + `BlockProvider`, migrate all block components and `RenderInline` to read from context. Delete `PluginContext` + `BlockIncompleteContext`. Verify: `vp check` + `vp test` (same 96 pass / 1 pre-existing fail).
2. **Token reconciliation** — Add `createStore` + `reconcile` to `RenderInline`. Verify: streaming tests still pass, DOM identity improved.
3. **Animation** — Add `AnimatedText`, CSS, `animated` prop. Verify: visual testing in playground.

Each step is independently verifiable and committable.
