# Animation Parity Plan — Match Streamdown Exactly

**Goal:** Rewrite velomark's streaming text animation to match streamdown's algorithm: character-precise offset tracking, continuous stagger across all text tokens in a block, and correct skip-already-rendered semantics.

---

## Streamdown's Algorithm (the target)

Streamdown uses a rehype plugin that walks ALL text nodes in a block's HAST tree with ONE shared counter:

```
charCounter = { count: 0, newIndex: 0 }

for each text node in tree (depth-first):
  for each word in text node:
    partStart = charCounter.count           # absolute char offset
    charCounter.count += word.length        # advance global counter

    if whitespace:
      emit as plain text (no span)
      continue

    skipAnimation = prevLen > 0 && partStart < prevLen
    delay = skipAnimation ? 0 : newIndex++ * stagger
    duration = skipAnimation ? 0 : config.duration

    emit <span style="--sd-duration:${duration}ms;--sd-delay:${delay}ms">
```

**Three critical properties:**

1. **Continuous stagger** — `newIndex` increments across ALL text nodes (bold/italic/link text included)
2. **Character precision** — `partStart` is absolute character offset, robust to mid-word streaming
3. **Skip already-rendered** — words whose character start is below `prevContentLength` get `duration=0`

`prevContentLength` is transferred between renders: the block component calls `plugin.getLastRenderCharCount()` (returns previous count, resets to 0) then `plugin.setPrevContentLength(count)` before the next render.

---

## Velomark's Current Implementation (the problem)

```
ParagraphBlock
  └─ RenderInline
       └─ createMemo(() => parseInline(text))     ← token array (new objects each call)
            └─ RenderInlineTokens
                 └─ <For each={stringKeys}>        ← stable keys (FIXED: no remount)
                      └─ InlineTokenView
                           └─ <Switch>/<Match>
                                ├─ case "text": AnimatedTextToken → AnimatedText
                                ├─ case "emphasis": <em><RenderInlineTokens/></em>
                                └─ etc.
```

Each `AnimatedText` has its OWN `prevWordCount`:

- No shared counter → stagger restarts at 0 for each text token
- Word-count based → misses mid-word streaming (word count stays same, word content grows)
- Per-token isolation → "scattered" visual effect

---

## Solution: Pre-Compute Animation Metadata in a Single Pass

### Core idea

Replace per-token `AnimatedText` computation with a **block-level pre-computation** that mirrors streamdown's single-pass algorithm exactly.

```
RenderInline
  ├─ tokens = createMemo(() => parseInline(text))     ← existing
  ├─ animMeta = createMemo(() => computeAnimation(     ← NEW: single pass
  │      tokens, config, prevContentLength
  │    ))
  └─ RenderInlineTokens tokens={tokens()} animMeta={animMeta}
       └─ <For each={stringKeys}>
            └─ InlineTokenView
                 └─ case "text": AnimatedText
                      reads meta reactively from animMeta  ← KEY CHANGE
```

`computeAnimation` walks ALL tokens recursively with a shared counter — exactly like streamdown's `visitParents`. It produces a `Map<string, WordMeta[]>` keyed by token path (e.g., `"0"`, `"1.0"`, `"2"`).

`AnimatedText` receives its `path` prop and reads `animMeta()[path]` reactively. When `animMeta` recomputes (text changed), the style updates without remounting the span.

`prevContentLength` persists as a mutable closure variable in `RenderInline` (not in a memo, not in a store).

---

## Task Breakdown

### Task 1: Create `computeAnimation` pure function

**Files:**

- Create: `packages/core/src/lib/animation/compute-animation.ts`

A pure function that walks inline tokens, splits text tokens into words, and assigns animation metadata using a shared character counter. Direct port of streamdown's `processTextNode` + `visitParents` logic.

```ts
export interface WordMeta {
  text: string;
  delay: number; // 0 for first new word, increments by stagger
  duration: number; // 0 = skip (already visible), config.duration = animate
  isWhitespace: boolean;
}

export interface AnimationConfig {
  animation: string;
  duration: number;
  easing: string;
  sep: "word" | "char";
  stagger: number;
}

export interface AnimationResult {
  /** Map from token path → word metadata array. */
  entries: Map<string, WordMeta[]>;
  /** Total character count across all text tokens. */
  totalChars: number;
}

export function computeAnimation(
  tokens: InlineToken[],
  config: AnimationConfig,
  prevContentLength: number,
): AnimationResult;
```

The function:

1. Initializes `charCount = 0`, `newIndex = 0`
2. Walks tokens recursively (depth-first, matching render order)
3. For each `text` token: splits into words, computes `partStart = charCount` per word
4. For each word: `skipAnimation = prevContentLength > 0 && partStart < prevContentLength`
5. `delay = skipAnimation ? 0 : newIndex++ * stagger`, `duration = skipAnimation ? 0 : config.duration`
6. Stores result in `entries` map keyed by token path (e.g., `"0"`, `"1.0"`, `"2"`)
7. Returns `{ entries, totalChars: charCount }`

Skip `code` tokens entirely (matches streamdown `SKIP_TAGS`). Recurse into `emphasis`, `strong`, `delete`, `link`, `text-directive`, `html-element` children.

---

### Task 2: Rewrite `AnimatedText` to read from pre-computed metadata

**Files:**

- Modify: `packages/core/src/render/inline/animated-text.tsx`

Remove the internal `prevWordCount`, `wordMeta` memo, `createStore`, `reconcile`. The component becomes a PURE RENDERER that reads metadata from a reactive source.

```tsx
export const AnimatedText: Component<{
  text: string;
  path: string;
  config: Required<AnimateOptions>;
  animMeta: () => Map<string, WordMeta[]> | null;
}> = (props) => {
  const words = createMemo(() =>
    props.config.sep === "char" ? splitIntoChars(props.text) : splitIntoWords(props.text),
  );
  const keys = createMemo(() => words().map((_, i) => String(i)));

  return (
    <For each={keys()}>
      {(_key, forIndex) => {
        const word = () => words()[forIndex()];
        const meta = () => props.animMeta()?.get(props.path)?.[forIndex()];

        return (
          <Show when={meta()?.isWhitespace === false} fallback={word()}>
            <span
              data-velomark-animate
              style={{
                "--vm-animation": `vm-${props.config.animation}`,
                "--vm-duration": `${meta()?.duration ?? 0}ms`,
                "--vm-easing": props.config.easing,
                ...(meta()?.delay ? { "--vm-delay": `${meta().delay}ms` } : {}),
              }}
            >
              {word()}
            </span>
          </Show>
        );
      }}
    </For>
  );
};
```

Key changes:

- No `prevWordCount` — metadata comes from the pre-computed pass
- No `wordMeta` memo — metadata is reactive via `props.animMeta()`
- `path` prop identifies which token's words to read
- `config` is pre-resolved (passed from parent, not re-resolved)

---

### Task 3: Thread `path` through the token rendering tree

**Files:**

- Modify: `packages/core/src/render/inline/inline-token-view.tsx`

`RenderInlineTokens` receives `animMeta` and passes `path` to each `InlineTokenView`. Recursive cases (`emphasis`, `strong`, `link`, etc.) extend the path for children.

```tsx
export const RenderInlineTokens: Component<{
  tokens: InlineToken[];
  animMeta?: () => Map<string, WordMeta[]> | null;
  basePath?: string;
}> = (props) => {
  const keys = createMemo(() => props.tokens.map((_, i) => String(i)));

  return (
    <For each={keys()}>
      {(_key, forIndex) => {
        const path = `${props.basePath ?? ""}${forIndex()}`;
        return (
          <InlineTokenView token={props.tokens[forIndex()]} path={path} animMeta={props.animMeta} />
        );
      }}
    </For>
  );
};
```

`InlineTokenView` receives `path` and `animMeta`, passes them to `AnimatedText` for `case "text"`, and threads `path + "."` as `basePath` for recursive `<RenderInlineTokens>` calls inside `emphasis`, `strong`, `link`, etc.

---

### Task 4: Rewrite `RenderInline` to pre-compute animation

**Files:**

- Modify: `packages/core/src/render/inline/render-inline.tsx`

```tsx
export const RenderInline: Component<{ text?: string }> = (props) => {
  const vm = useVelomark();
  const block = useBlock();
  const tokens = createMemo(() => parseInline(props.text ?? "", vm.definitions));

  // Mutable coordinator — persists across updates within this block.
  let prevContentLength = 0;

  // Single-pass animation computation. Runs on every text update.
  const animMeta = createMemo(() => {
    const ts = tokens();
    if (!vm.animationConfig || !block.isStreaming) return null;

    const config = resolveConfig(vm.animationConfig);
    const result = computeAnimation(ts, config, prevContentLength);
    prevContentLength = result.totalChars; // save for next render
    return result.entries;
  });

  // Reset prevContentLength when block stops streaming (new streaming session starts fresh)
  createEffect(() => {
    if (!block.isStreaming) prevContentLength = 0;
  });

  return <RenderInlineTokens tokens={tokens()} animMeta={animMeta} />;
};
```

Key changes:

- `prevContentLength` is a closure variable (persists across memo re-evaluations)
- `animMeta` memo walks ALL tokens in a single pass with continuous stagger
- Reset `prevContentLength` when block completes streaming
- `block` comes from `useBlock()` — requires `BlockProvider` (already exists in production)

---

### Task 5: Update `AnimatedTextToken` to pass `path` and `animMeta`

**Files:**

- Modify: `packages/core/src/render/inline/inline-token-view.tsx`

The `AnimatedTextToken` component (which gates animation on `block.isStreaming`) needs to receive `path`, `config`, and `animMeta` from `InlineTokenView` and pass them to `AnimatedText`.

```tsx
const AnimatedTextToken: Component<{
  token: InlineToken;
  path: string;
  config: Required<AnimateOptions>;
  animMeta: () => Map<string, WordMeta[]> | null;
}> = (props) => {
  const block = useBlock();
  return (
    <Show when={block.isStreaming} fallback={(props.token as TokenOf<"text">).text}>
      <AnimatedText
        text={(props.token as TokenOf<"text">).text}
        path={props.path}
        config={props.config}
        animMeta={props.animMeta}
      />
    </Show>
  );
};
```

`InlineTokenView` resolves `config` once from `vm.animationConfig` and passes it down:

```tsx
const resolvedConfig = vm.animationConfig ? resolveConfig(vm.animationConfig) : null;

// In case "text":
<Match when={props.token.type === "text"}>
  <Show when={resolvedConfig && block.isStreaming} fallback={...}>
    <AnimatedTextToken
      token={props.token}
      path={props.path}
      config={resolvedConfig!}
      animMeta={props.animMeta}
    />
  </Show>
</Match>
```

Wait — `InlineTokenView` already calls `useBlock()` indirectly via `AnimatedTextToken`. Let me check if `useBlock()` is called at the top level of `InlineTokenView`... Currently it's NOT — it's only called inside `AnimatedTextToken`. Good — this means tests without `BlockProvider` still work for non-animated tokens.

But `RenderInline` now calls `useBlock()` directly. Tests that render `<RenderInline>` inside `<VelomarkProvider>` (without `<BlockProvider>`) will break.

**Fix:** Make `useBlock()` optional in `RenderInline`. If there's no `BlockProvider`, skip animation:

```tsx
const block = useContext(BlockContext);
// ...
if (!vm.animationConfig || !block || !block().isStreaming) return null;
```

---

### Task 6: Remove debug `console.log` statements

**Files:**

- Modify: `packages/core/src/render/inline/animated-text.tsx`
- Modify: `packages/core/src/render/inline/inline-token-view.tsx`
- Modify: `packages/core/src/render/inline/render-inline.tsx`
- Modify: `packages/core/src/lib/model/stable-id.ts`
- Modify: `packages/core/src/render/velomark.tsx`

Remove ALL `console.log` statements added during debugging. Also remove the `renderId` counter in `animated-text.tsx`.

---

### Task 7: Fix `stable-id.ts` test failures

**Files:**

- Modify: `packages/core/src/lib/model/stable-id.ts`
- Modify: `packages/core/src/lib/model/__tests__/stable-id.test.ts`

The `isStreamGrowthMatch` function is too aggressive — it matches blocks that should get new IDs (test: "replaces the id when the tail block fingerprint changes").

**Fix:** Only apply `isStreamGrowthMatch` when the block is in `streaming` status:

```ts
function isStreamGrowthMatch<TData>(
  previous: RenderBlock<TData> | undefined,
  next: DraftRenderBlock<TData>,
): previous is RenderBlock<TData> {
  return Boolean(
    previous &&
    previous.kind === next.kind &&
    previous.sourceStart === next.sourceStart &&
    next.sourceEnd >= previous.sourceEnd &&
    previous.status === "streaming", // ← only during streaming
  );
}
```

Update the test "replaces the id when the tail block fingerprint changes" to expect `idChanged: false` when the previous block is streaming, and `idChanged: true` when it's complete.

Also fix the `render-patch.test.ts` failures (same root cause — `isStreamGrowthMatch` matches too broadly for non-streaming blocks).

---

### Task 8: Clean up `split-text.ts`

**Files:**

- Modify: `packages/core/src/lib/animation/split-text.ts`

Remove the `isWhitespaceOnly` export if it's no longer needed (the `computeAnimation` function inlines the check). Or keep it if `AnimatedText` still uses it.

Actually, `AnimatedText` still uses `splitIntoWords`/`splitIntoChars`. Keep them. The `isWhitespaceOnly` helper is used by `computeAnimation` — keep it exported.

---

## Dependency Graph

```
Task 1: computeAnimation function    ← no deps
Task 2: Rewrite AnimatedText          ← needs Task 1
Task 3: Thread path through tree      ← needs Task 2
Task 4: Rewrite RenderInline          ← needs Task 1
Task 5: Update AnimatedTextToken      ← needs Tasks 2+3+4
Task 6: Remove debug logs             ← do LAST
Task 7: Fix stable-id tests           ← independent
Task 8: Clean up split-text           ← do LAST
```

**Recommended execution:**

1. Task 7 (fix tests first — unblocks verification)
2. Tasks 1+2+3+4+5 (TOGETHER — they're interdependent)
3. Task 8 (cleanup)
4. Task 6 (remove logs)

---

## Verification Checklist

After all tasks:

- [ ] `vp check` — 0 errors, 0 warnings
- [ ] `vp run --filter ./packages/core test` — 96+ pass / 1 pre-existing fail
- [ ] Stream markdown in playground — animation flows left-to-right smoothly
- [ ] Multiple text tokens in one paragraph (e.g. `text **bold** text`) stagger continuously
- [ ] Mid-word streaming (e.g. `Hel` → `Hello`) animates correctly
- [ ] Already-rendered words don't re-animate on subsequent tokens
- [ ] When block completes streaming, animation spans are stripped (plain text)
- [ ] No `console.log` noise in production paths
