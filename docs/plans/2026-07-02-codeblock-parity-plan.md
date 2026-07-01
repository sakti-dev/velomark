# Codeblock Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a velomark-native Shiki highlighter package (`@velomark/code`) and fix the rendering layer so code blocks reach full parity with streamdown-code.

**Architecture:** New `packages/code/` ports streamdown-code's highlighter logic (singleton cache, token cache, subscriber fan-out, JS regex engine, language aliases, text fallback, dual themes). The rendering layer in `packages/core` redirects token/pre styles to CSS custom properties (`--vm-*`) so dark-mode class switching works, and parses Shiki's semicolon-delimited dual-theme bg/fg strings.

**Tech Stack:** Shiki v3 (`createJavaScriptRegexEngine`), SolidJS (core rendering), plain CSS (styles.css), Vite+ (`vp` toolchain), Vitest

---

## Critical Runtime Knowledge

Shiki's `codeToTokens` with dual themes `{ light, dark }` returns:

- `token.htmlStyle` is an **object** at runtime: `{"color":"#D73A49","--shiki-dark":"#F97583"}`
- `token.color` is `undefined` in dual-theme mode (the light color lives in `htmlStyle.color`)
- `result.bg` is a **semicolon-delimited string**: `"#fff;--shiki-dark-bg:#24292e"` — designed for CSS style-attribute injection (light value first, dark CSS vars after)
- `result.fg` is the same pattern: `"#24292e;--shiki-dark:#e1e4e8"`
- `result.rootStyle` is `undefined` for both single and dual themes in current Shiki (handle defensively)

With single `theme` (not `themes`):

- `token.color` = direct color, `token.htmlStyle` = undefined
- `result.bg` = plain color like `"#24292e"` (no semicolons)

The rendering must redirect direct `color`/`background-color` to `--vm-*` CSS custom properties because inline styles have higher specificity than CSS class rules — a `.dark .vm-token { color: var(--shiki-dark) }` rule cannot override `style="color: #D73A49"`.

---

### Task 1: Scaffold `packages/code/` Package

**Files:**

- Create: `packages/code/package.json`
- Create: `packages/code/vite.config.ts`

**Step 1: Create package.json**

```json
{
  "name": "@velomark/code",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts"
    }
  },
  "scripts": {
    "build": "vp pack",
    "test": "vp test",
    "check": "vp check"
  },
  "dependencies": {
    "shiki": "^3.22.0"
  }
}
```

**Step 2: Create vite.config.ts**

```ts
import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    dts: { tsgo: true },
    exports: false,
    clean: true,
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
```

**Step 3: Install dependencies**

Run: `vp install`
Expected: workspace recognizes the new package, shiki resolves from root.

**Step 4: Verify type checking includes new package**

Run: `vp check`
Expected: PASS (no errors yet — no source files)

**Step 5: Commit**

```bash
git add packages/code/package.json packages/code/vite.config.ts
git commit -m "feat(code): scaffold @velomark/code package"
```

---

### Task 2: Port the Highlighter Logic

**Files:**

- Create: `packages/code/src/index.ts`
- Create: `packages/code/src/__tests__/index.test.ts`
- Reference: `docs/references/streamdown/packages/streamdown-code/index.ts`

**Step 1: Write the highlighter implementation**

Create `packages/code/src/index.ts`. This is a faithful port of streamdown-code's `index.ts` with zero behavioral changes. Copy the reference file at `docs/references/streamdown/packages/streamdown-code/index.ts` and make these naming changes:

- Remove the `"use client"` directive (line 1)
- Keep all exports and logic identical: `createCodePlugin`, `code`, `CodePluginOptions`, `CodeHighlighterPlugin`, `HighlightResult`, `HighlightOptions`, `ThemeInput`
- Keep the `createJavaScriptRegexEngine({ forgiving: true })` setup
- Keep singleton highlighter cache, token cache, subscriber fan-out, `normalizeLanguage`, `text` fallback

The entire file content is the reference at `docs/references/streamdown/packages/streamdown-code/index.ts` minus line 1.

**Step 2: Write tests**

Create `packages/code/src/__tests__/index.test.ts`. Port from `docs/references/streamdown/packages/streamdown-code/__tests__/index.test.ts`. The 16 test cases are:

1. Plugin properties (name/type, default themes)
2. supportsLanguage (true for common langs, false for unknown)
3. getSupportedLanguages (array, includes common langs)
4. highlight: returns null initially, calls callback async
5. highlight: returns cached result on subsequent calls
6. highlight: works without a callback
7. highlight: handles code >100 chars
8. highlight: notifies multiple subscribers
9. highlight: falls back to text for "text" language
10. highlight: falls back to text for unknown "javas"
11. highlight: highlights language aliases (js)
12. Error handling: invalid themes → console.error, callback never fires
13. createCodePlugin: default themes
14. createCodePlugin: custom themes
15. createCodePlugin: retains all methods
16. createCodePlugin: custom theme objects + mixed themes + nameless fallback + highlights with custom themes

Copy the reference test file. Change the import path from `"../index"` to `"../index"` (same — the test is co-located). No other changes needed.

**Step 3: Run tests**

Run: `vp run --filter ./packages/code test`
Expected: all 16 tests PASS (async tests use `vi.waitFor` with 5s timeout; Shiki JS engine loads grammars on-demand)

**Step 4: Run check**

Run: `vp check --fix`
Expected: PASS (no lint/type errors)

**Step 5: Commit**

```bash
git add packages/code/src/
git commit -m "feat(code): port streamdown-code highlighter logic with tests"
```

---

### Task 3: Widen FENCE_RE Language Charset

**Files:**

- Modify: `packages/core/src/lib/parser/context.ts:8`
- Test: `packages/core/src/lib/parser/__tests__/block-boundaries.test.ts`

**Step 1: Write the failing test**

Add to `packages/core/src/lib/parser/__tests__/block-boundaries.test.ts`:

````ts
it("preserves special characters in fence language (c#, c++, .env)", () => {
  const blocks = parseBlockBoundaries(["```c#", "Console.WriteLine();", "```"].join("\n"));
  expect(blocks[0]?.data).toMatchObject({ language: "c#" });

  const blocks2 = parseBlockBoundaries(["```c++", "std::cout << 1;", "```"].join("\n"));
  expect(blocks2[0]?.data).toMatchObject({ language: "c++" });
});
````

**Step 2: Run test to verify it fails**

Run: `vp run --filter ./packages/core test -- block-boundaries`
Expected: FAIL — `c#` truncated to `c`, meta is `#`

**Step 3: Fix FENCE_RE**

In `packages/core/src/lib/parser/context.ts:8`, change:

````ts
// BEFORE:
const FENCE_RE = /^```([A-Za-z0-9_-]+)?(.*)$/;

// AFTER:
const FENCE_RE = /^```(\S+)?(.*)$/;
````

**Step 4: Run ALL parser tests**

Run: `vp run --filter ./packages/core test`
Expected: ALL PASS (123 pass, 1 pre-existing fail unchanged)

**Step 5: Commit**

```bash
git add packages/core/src/lib/parser/context.ts packages/core/src/lib/parser/__tests__/block-boundaries.test.ts
git commit -m "fix(parser): widen FENCE_RE to accept c#, c++, .env fence languages"
```

---

### Task 4: Dual-Theme Style Helpers

**Files:**

- Create: `packages/core/src/render/code-block/style-utils.ts`
- Create: `packages/core/src/render/code-block/__tests__/style-utils.test.ts`

**Step 1: Write the failing tests**

Create `packages/core/src/render/code-block/__tests__/style-utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildTokenStyle, parseShikiStyle } from "../style-utils";

describe("parseShikiStyle", () => {
  it("extracts plain light value and dark CSS vars from dual-theme bg", () => {
    const result = parseShikiStyle("#fff;--shiki-dark-bg:#24292e", "--vm-bg");
    expect(result).toEqual({
      "--vm-bg": "#fff",
      "--shiki-dark-bg": "#24292e",
    });
  });

  it("handles single-theme plain color (no semicolons)", () => {
    const result = parseShikiStyle("#24292e", "--vm-bg");
    expect(result).toEqual({ "--vm-bg": "#24292e" });
  });

  it("handles rootStyle with only CSS var declarations", () => {
    const result = parseShikiStyle("--shiki-dark-bg:#24292e;--shiki-dark:#e1e4e8", "--vm-bg");
    expect(result).toEqual({
      "--shiki-dark-bg": "#24292e",
      "--shiki-dark": "#e1e4e8",
    });
  });

  it("returns empty object for undefined input", () => {
    expect(parseShikiStyle(undefined, "--vm-bg")).toEqual({});
    expect(parseShikiStyle(false, "--vm-bg")).toEqual({});
  });
});

describe("buildTokenStyle", () => {
  it("redirects direct color to --vm-c (single-theme mode)", () => {
    const result = buildTokenStyle({ content: "x", color: "#F97583" });
    expect(result).toEqual({ "--vm-c": "#F97583" });
  });

  it("redirects htmlStyle.color to --vm-c and passes --shiki-dark through (dual-theme)", () => {
    const result = buildTokenStyle({
      content: "x",
      htmlStyle: { color: "#D73A49", "--shiki-dark": "#F97583" },
    });
    expect(result).toEqual({
      "--vm-c": "#D73A49",
      "--shiki-dark": "#F97583",
    });
  });

  it("redirects background-color to --vm-tbg", () => {
    const result = buildTokenStyle({
      content: "x",
      bgColor: "#fff",
      htmlStyle: { "background-color": "#eee", "--shiki-dark-bg": "#333" },
    });
    expect(result).toEqual({
      "--vm-tbg": "#eee",
      "--shiki-dark-bg": "#333",
    });
  });

  it("passes through non-color htmlStyle properties as-is", () => {
    const result = buildTokenStyle({
      content: "x",
      htmlStyle: { "font-weight": "bold", "--shiki-dark": "#F97583" },
    });
    expect(result).toEqual({
      "--shiki-dark": "#F97583",
      "font-weight": "bold",
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `vp run --filter ./packages/core test -- style-utils`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `packages/core/src/render/code-block/style-utils.ts`:

```ts
import type { HighlightToken } from "../../lib/plugin-types";

export function parseShikiStyle(
  shikiValue: string | false | undefined,
  lightVar: string,
): Record<string, string> {
  if (!shikiValue) return {};
  const style: Record<string, string> = {};
  for (const segment of shikiValue.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const prop = trimmed.slice(0, colonIdx).trim();
      const val = trimmed.slice(colonIdx + 1).trim();
      if (prop && val) style[prop] = val;
    } else {
      style[lightVar] = trimmed;
    }
  }
  return style;
}

export function buildTokenStyle(token: HighlightToken): Record<string, string> {
  const style: Record<string, string> = {};
  if (token.color) style["--vm-c"] = token.color;
  if (token.bgColor) style["--vm-tbg"] = token.bgColor;
  if (token.htmlStyle) {
    for (const [key, value] of Object.entries(token.htmlStyle)) {
      if (key === "color") style["--vm-c"] = value;
      else if (key === "background-color") style["--vm-tbg"] = value;
      else style[key] = value;
    }
  }
  return style;
}
```

**Step 4: Run tests to verify pass**

Run: `vp run --filter ./packages/core test -- style-utils`
Expected: PASS (all 8 tests)

**Step 5: Commit**

```bash
git add packages/core/src/render/code-block/style-utils.ts packages/core/src/render/code-block/__tests__/style-utils.test.ts
git commit -m "feat(code-block): add dual-theme style helpers"
```

---

### Task 5: Apply Dual-Theme Rendering in `highlighted-body.tsx`

**Files:**

- Modify: `packages/core/src/render/code-block/highlighted-body.tsx`
- Modify: `packages/core/src/render/__tests__/render-blocks.test.tsx`

**Step 1: Write failing test for CSS-var redirect on tokens**

Add to `packages/core/src/render/__tests__/render-blocks.test.tsx` in the code block test section:

````ts
it("redirects token colors to --vm-c CSS custom property", async () => {
  const host = document.createElement("div");
  document.body.append(host);

  const dispose = render(
    () => (
      <Velomark
        markdown={"```ts\nconst answer = 42;\n```"}
        plugins={{ code: mockCodePlugin }}
      />
    ),
    host,
  );
  mountedRoots.push(dispose);

  await waitFor(
    () => (host.querySelectorAll(".vm-code-highlighted span").length ?? 0) > 0,
    500,
  );

  const tokenSpan = host.querySelector(".vm-code-highlighted .vm-line span");
  expect(tokenSpan).not.toBeNull();
  const style = tokenSpan?.getAttribute("style") ?? "";
  expect(style).toContain("--vm-c");
  expect(style).not.toMatch(/^\s*color:/);
});
````

**Step 2: Run test to verify it fails**

Run: `vp run --filter ./packages/core test -- "redirects token colors"`
Expected: FAIL — current tokens have `style="color:#aab"` (direct inline color)

**Step 3: Rewrite `highlighted-body.tsx`**

Replace `packages/core/src/render/code-block/highlighted-body.tsx` entirely. Key changes:

- Import `buildTokenStyle` and `parseShikiStyle` from `./style-utils`
- Remove the old `buildTokenStyle` function (now imported)
- Add `buildPreStyle` memo that consumes `result().bg`, `result().fg`, `result().rootStyle`
- Token `<span>` gets `class="vm-token"` + `style={buildTokenStyle(token)}`
- `<pre>` gets `class="vm-code-pre"` + `style={preStyle()}`

```tsx
import { type Component, createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { cn } from "cnfast";

import type { CodeHighlighterPlugin, HighlightResult } from "../../lib/plugin-types";
import { buildTokenStyle, parseShikiStyle } from "./style-utils";

export interface HighlightedCodeBlockBodyProps {
  code: string;
  language?: string;
  lineNumbers?: boolean;
  plugin: CodeHighlighterPlugin;
  startLine?: number;
}

export const HighlightedCodeBlockBody: Component<HighlightedCodeBlockBodyProps> = (props) => {
  const [result, setResult] = createSignal<HighlightResult | null>(null);

  createEffect(() => {
    const plugin = props.plugin;
    const immediate = plugin.highlight(
      {
        code: props.code,
        language: props.language?.trim() || "text",
        themes: plugin.getThemes(),
      },
      (next) => setResult(next),
    );
    if (immediate) setResult(immediate);
  });

  const lines = () => result()?.tokens ?? [];

  const preStyle = createMemo(() => {
    const r = result();
    if (!r) return {};
    return {
      ...parseShikiStyle(r.bg, "--vm-bg"),
      ...parseShikiStyle(r.fg, "--vm-fg"),
      ...(typeof r.rootStyle === "string" ? parseShikiStyle(r.rootStyle, "--vm-bg") : {}),
    };
  });

  return (
    <div
      class={cn(
        "vm-code-body overflow-x-auto rounded-md border border-border bg-background p-4 text-sm",
      )}
      data-language={props.language}
    >
      <pre class="vm-code-pre" style={preStyle()}>
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
                      {(token) => (
                        <span class="vm-token" style={buildTokenStyle(token)}>
                          {token.content}
                        </span>
                      )}
                    </For>
                  </span>
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

**Step 4: Update existing test for new DOM structure**

The test "renders highlighted code tokens for supported languages" at line ~247 currently asserts `:scope > span.vm-line > span`. Token spans now have class `vm-token`, so update to `:scope > span.vm-line > span.vm-token`:

```ts
expect(
  highlighted?.querySelectorAll(":scope > span.vm-line > span.vm-token").length,
).toBeGreaterThan(1);
```

Also update the mock plugin if needed — the current mock returns `{ color: "#aab", content }` on each token, which is the single-theme path. This exercises the `token.color → --vm-c` redirect.

**Step 5: Run all tests**

Run: `vp run --filter ./packages/core test`
Expected: ALL PASS (124+ pass, 1 pre-existing fail unchanged)

**Step 6: Commit**

```bash
git add packages/core/src/render/code-block/highlighted-body.tsx packages/core/src/render/__tests__/render-blocks.test.tsx
git commit -m "feat(code-block): redirect token/pre styles to CSS custom properties for dual-theme"
```

---

### Task 6: Add Dual-Theme CSS to `styles.css`

**Files:**

- Modify: `packages/core/styles.css`

**Step 1: Add CSS rules**

Append to `packages/core/styles.css` (after the existing `.vm-line` rules):

```css
.vm-code-pre {
  background-color: var(--vm-bg, inherit);
  color: var(--vm-fg, inherit);
}
.vm-token {
  color: var(--vm-c, inherit);
  background-color: var(--vm-tbg, transparent);
}

.dark .vm-code-pre {
  background-color: var(--shiki-dark-bg, var(--vm-bg, inherit));
  color: var(--shiki-dark, var(--vm-fg, inherit));
}
.dark .vm-token {
  color: var(--shiki-dark, var(--vm-c, inherit));
  background-color: var(--shiki-dark-bg, var(--vm-tbg, transparent));
}
```

**Step 2: Run check**

Run: `vp check --fix`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/core/styles.css
git commit -m "feat(styles): add dual-theme CSS rules for code blocks"
```

---

### Task 7: Clean Dead Options and Exports

**Files:**

- Modify: `packages/core/src/types.ts:138-147`
- Modify: `packages/core/src/render/code-block/index.tsx:20,23-32`

**Step 1: Remove dead options from types**

In `packages/core/src/types.ts`, change:

```ts
// BEFORE:
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

// AFTER:
export interface VelomarkCodeBlockOptions {
  copyButton?: boolean;
  downloadButton?: boolean;
  highlight?: boolean;
  languageLabel?: boolean;
  lineNumbers?: boolean;
}
```

**Step 2: Remove dead options from DEFAULT_CODE_BLOCK_OPTIONS and CodeBlockSkeleton export**

In `packages/core/src/render/code-block/index.tsx`:

Remove line 20:

```ts
export { CodeBlockSkeleton } from "./skeleton";
```

Change defaults:

```ts
// BEFORE:
export const DEFAULT_CODE_BLOCK_OPTIONS: Required<VelomarkCodeBlockOptions> = {
  copyButton: true,
  defaultView: "preview",
  downloadButton: true,
  highlight: true,
  highlightTheme: "github-dark",
  languageLabel: true,
  lineNumbers: true,
  previewToggle: true,
};

// AFTER:
export const DEFAULT_CODE_BLOCK_OPTIONS: Required<VelomarkCodeBlockOptions> = {
  copyButton: true,
  downloadButton: true,
  highlight: true,
  languageLabel: true,
  lineNumbers: true,
};
```

**Step 3: Check for references to removed options**

Run: `rg -n "defaultView|previewToggle|highlightTheme|CodeBlockSkeleton" packages/ dev/`
Expected: No hits (or only in docs/plans/)

If any hits remain in source, fix them.

**Step 4: Run check and tests**

Run: `vp check --fix && vp run --filter ./packages/core test`
Expected: PASS (all tests pass, 1 pre-existing fail unchanged)

**Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/render/code-block/index.tsx
git commit -m "refactor(code-block): remove dead options (highlightTheme, defaultView, previewToggle) and CodeBlockSkeleton"
```

---

### Task 8: Wire `@velomark/code` into Playground

**Files:**

- Modify: `dev/components/renderer-panel.tsx`

**Step 1: Add the code plugin to the playground**

In `dev/components/renderer-panel.tsx`, add import and pass plugin:

```tsx
import type { Component } from "solid-js";
import { createCodePlugin } from "@velomark/code";
import { Velomark } from "velomark";
import type { VelomarkDebugMetrics } from "velomark";

export interface RendererPanelProps {
  markdown: string;
  onDebugMetrics?: (metrics: VelomarkDebugMetrics) => void;
  onSurfaceReady?: (element: HTMLDivElement) => void;
}

const codePlugin = createCodePlugin();

export const RendererPanel: Component<RendererPanelProps> = (props) => {
  return (
    <section class="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
      <header class="flex flex-col gap-1">
        <h2 class="font-semibold text-foreground text-lg tracking-tight">Renderer Viewport</h2>
        <p class="text-muted-foreground text-sm leading-6">
          Rendered output updates here as presets and stream controls change.
        </p>
      </header>
      <div
        class="renderer-surface min-h-[28rem] rounded-lg border border-border bg-background p-4"
        ref={(element) => {
          props.onSurfaceReady?.(element);
        }}
      >
        <div class="markdown-content" data-component="markdown">
          <Velomark
            animated
            caret="block"
            debug={false}
            markdown={props.markdown}
            onDebugMetrics={props.onDebugMetrics}
            plugins={{ code: codePlugin }}
            remend={{}}
          />
        </div>
      </div>
    </section>
  );
};
```

**Step 2: Add @velomark/code to root devDependencies**

In root `package.json`, add to `devDependencies`:

```json
"@velomark/code": "workspace:*",
```

Run: `vp install`

**Step 3: Run check**

Run: `vp check --fix`
Expected: PASS

**Step 4: Commit**

```bash
git add dev/components/renderer-panel.tsx package.json
git commit -m "dev: wire @velomark/code highlighter into playground"
```

---

### Task 9: Final Verification + ROADMAP Update

**Step 1: Full check**

Run: `vp check`
Expected: PASS (0 errors, all files formatted)

**Step 2: Full test suite**

Run: `vp run --filter ./packages/core test && vp run --filter ./packages/code test`
Expected: All tests pass (core: 124+, 1 pre-existing fail; code: 16 new)

**Step 3: Update ROADMAP.md**

Mark item #3 (Dual-theme Shiki dark mode) as done:

```markdown
### 3. [done] Dual-theme Shiki dark mode

Token styles redirected to `--vm-*` CSS custom properties; `.dark` selector in `styles.css` switches to Shiki's `--shiki-dark` / `--shiki-dark-bg` vars. New `@velomark/code` package provides the Shiki highlighter with dual-theme support out of the box.
```

Add to completed list at top:

```markdown
- [done] Dual-theme Shiki dark mode — CSS-var redirect + @velomark/code package (`<commit>`)
```

**Step 4: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: mark dual-theme Shiki dark mode as completed in ROADMAP"
```
