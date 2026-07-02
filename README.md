<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=velomark&background=tiles&project=%20" alt="velomark">
</p>

# velomark

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)

Solid-only Markdown rendering built for streamed AI responses.[^incremark]

`@velomark/core` is a Solid.js component for apps that need Markdown rendering to stay responsive while content is still arriving. It is optimized for append-heavy streams, stable DOM identity for already-rendered blocks, and a restrained Solid-first API that is easy to integrate into product code.

## Overview

Formatting Markdown is easy, but when you tokenize and stream it, new challenges arise. Velomark is built specifically to handle the unique requirements of streaming Markdown content from AI models, providing seamless formatting even with incomplete or unterminated Markdown blocks.

Velomark powers the [playground](https://velomark.vercel.app) but can be installed as a standalone package for your own streaming needs.

## Features

- **Streaming-optimized** — Handles incomplete Markdown gracefully via `remend`
- **Plugin system** — Code highlighting (Shiki), Math (KaTeX), and Mermaid diagrams as optional plugins
- **Animation support** — Fade-in, blur-in, and slide-up animations for streaming content
- **Code blocks** — Syntax highlighting, copy button, language label, line numbers, download
- **GitHub Flavored Markdown** — Tables, task lists, and strikethrough support
- **Math rendering** — LaTeX equations via KaTeX plugin
- **Mermaid diagrams** — Render Mermaid diagrams with pan/zoom/fullscreen controls
- **Container directives** — Custom callouts, warnings, and info blocks
- **Link safety** — Optional confirmation modal for external links
- **Internationalization** — Built-in translation support with English defaults
- **Accessibility** — RTL/LTR direction support
- **Security-first** — Sanitize your Markdown before passing it to Velomark

## Installation

```bash
pnpm add @velomark/core solid-js
```

Then import the stylesheet in your app:

```css
@import "@velomark/core/styles.css";
```

### Optional plugins

Velomark's full power comes from its plugin ecosystem. Install only what you need:

```bash
pnpm add @velomark/code    # Shiki-based code highlighting
pnpm add @velomark/math    # KaTeX math rendering
pnpm add @velomark/mermaid # Mermaid diagram rendering
```

### CSS Custom Properties

Velomark components rely on shadcn/ui-style CSS custom properties for colors, border radius, and spacing. Add the following to your global CSS if you don't already have them:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --radius: 0.625rem;
}
```

## Quick start

```tsx
import { Velomark } from "@velomark/core";
import { createCodePlugin } from "@velomark/code";
import "@velomark/core/styles.css";

const code = createCodePlugin();

const markdown = `# Hello

This is **streamed** Markdown.

\`\`\`ts
const answer = 42;
\`\`\`
`;

export function Example() {
  return <Velomark markdown={markdown} plugins={{ code }} />;
}
```

## Common integration examples

### Render a live stream with animation

```tsx
import { createSignal } from "solid-js";
import { Velomark } from "@velomark/core";
import { createCodePlugin } from "@velomark/code";
import "@velomark/core/styles.css";

const code = createCodePlugin();

export function StreamingExample() {
  const [markdown, setMarkdown] = createSignal("# Thinking");

  const append = (chunk: string) => {
    setMarkdown((current) => current + chunk);
  };

  return (
    <>
      <button onClick={() => append("\n\nMore content arrived.")}>Append</button>
      <Velomark animated caret="block" markdown={markdown()} plugins={{ code }} />
    </>
  );
}
```

### With math and Mermaid

```tsx
import { Velomark } from "@velomark/core";
import { createCodePlugin } from "@velomark/code";
import { createMathPlugin } from "@velomark/math";
import { createMermaidPlugin } from "@velomark/mermaid";
import "@velomark/core/styles.css";

const code = createCodePlugin();
const math = createMathPlugin();
const mermaid = createMermaidPlugin();

export function FullExample(props: { markdown: string }) {
  return (
    <Velomark markdown={props.markdown} plugins={{ code, math, mermaid }} animated caret="block" />
  );
}
```

### Override a language-specific code block renderer

```tsx
import type { VelomarkCodeBlockRendererProps } from "@velomark/core";
import { Velomark } from "@velomark/core";
import { createCodePlugin } from "@velomark/code";
import "@velomark/core/styles.css";

const code = createCodePlugin();

function JsonBlock(props: VelomarkCodeBlockRendererProps) {
  return (
    <pre>
      <code>{JSON.stringify(JSON.parse(props.code), null, 2)}</code>
    </pre>
  );
}

export function CustomCodeExample(props: { markdown: string }) {
  return (
    <Velomark
      codeBlockRenderers={{ json: JsonBlock }}
      markdown={props.markdown}
      plugins={{ code }}
    />
  );
}
```

### Override a directive container

```tsx
import type { VelomarkContainerRendererProps } from "@velomark/core";
import { Velomark } from "@velomark/core";
import "@velomark/core/styles.css";

function Callout(props: VelomarkContainerRendererProps) {
  return (
    <aside data-callout={props.name}>
      <strong>{props.attributes?.title ?? "Note"}</strong>
      <div>{props.children}</div>
    </aside>
  );
}

export function CustomContainerExample(props: { markdown: string }) {
  return <Velomark containers={{ info: Callout, warning: Callout }} markdown={props.markdown} />;
}
```

### Use with AI SDK

```tsx
import { Velomark } from "@velomark/core";
import { createCodePlugin } from "@velomark/code";
import { createMathPlugin } from "@velomark/math";
import { createMermaidPlugin } from "@velomark/mermaid";
import "@velomark/core/styles.css";

const code = createCodePlugin();
const math = createMathPlugin();
const mermaid = createMermaidPlugin();

export function ChatMessage(props: { text: string; isStreaming: boolean }) {
  return (
    <Velomark
      animated
      caret={props.isStreaming ? "block" : undefined}
      markdown={props.text}
      plugins={{ code, math, mermaid }}
    />
  );
}
```

## What Velomark renders well

### Core blocks

- Paragraphs and headings
- Ordered, unordered, nested, and task lists
- Blockquotes
- Fenced code blocks with syntax highlighting (via plugin)
- Mermaid fences rendered as diagrams (via plugin)
- Tables with column alignment
- Thematic breaks
- Footnote definitions
- Math blocks (via plugin)
- Raw HTML blocks and structured HTML elements
- Container, leaf, and text directives

### Inline syntax

- Strong, emphasis, delete, and inline code
- Links and images
- Hard line breaks
- Footnote references
- Inline math (via plugin)
- Raw inline HTML and structured inline HTML elements
- Reference-style links and images, including collapsed and shortcut forms

### Streaming behavior

- Append-heavy content growth
- Tail rewrites
- Incomplete intermediate states for fences, references, directives, HTML, and tables
- Stable outer code-block shell while highlighted code grows

For the full status matrix, see [docs/feature-matrix.md](./docs/feature-matrix.md).

## Plugin system

Velomark's plugin system lets you add optional rendering capabilities without bloating the core package.

| Package             | Export                  | Purpose                         |
| ------------------- | ----------------------- | ------------------------------- |
| `@velomark/code`    | `createCodePlugin()`    | Shiki-based syntax highlighting |
| `@velomark/math`    | `createMathPlugin()`    | KaTeX math rendering            |
| `@velomark/mermaid` | `createMermaidPlugin()` | Mermaid diagram rendering       |

Each plugin factory accepts optional configuration. Pass the result to `<Velomark plugins={{...}}>`:

```tsx
<Velomark
  markdown={text}
  plugins={{
    code: createCodePlugin({
      /* options */
    }),
    math: createMathPlugin({
      /* options */
    }),
    mermaid: createMermaidPlugin({
      /* options */
    }),
  }}
/>
```

You can also write custom renderers for specific fenced code languages via `codeBlockRenderers` or custom containers via the `containers` prop.

## Code blocks

When the `code` plugin is installed, Velomark provides:

- Syntax highlighting via Shiki for supported languages
- A floating copy button
- A language badge
- Line numbers
- Download button
- Theme-aware colors via highlighted tokens

Configure with `codeBlockOptions`:

```tsx
<Velomark
  codeBlockOptions={{
    copyButton: true,
    downloadButton: false,
    highlight: true,
    languageLabel: true,
    lineNumbers: false,
  }}
  markdown={markdown}
  plugins={{ code: createCodePlugin() }}
/>
```

## Animation

Velomark supports per-block entrance animations for streaming content:

```tsx
<Velomark
  animated // boolean or AnimateOptions
  caret="block" // "block" | "circle" | undefined
  onAnimationEnd={callback}
  onAnimationStart={callback}
  markdown={text}
/>
```

`AnimateOptions`:

| Field       | Type                                | Description                       |
| ----------- | ----------------------------------- | --------------------------------- |
| `animation` | `"fadeIn" \| "blurIn" \| "slideUp"` | Animation style                   |
| `duration`  | `number`                            | Duration in ms                    |
| `easing`    | `string`                            | CSS easing function               |
| `sep`       | `"word" \| "char"`                  | Animate by word or character      |
| `stagger`   | `number`                            | Stagger delay in ms between items |

## Controls

Granular control over copy, download, and fullscreen buttons per content type:

```tsx
<Velomark
  controls={{
    code: { copy: true, download: false },
    mermaid: { download: true, fullscreen: true, panZoom: true },
    table: { copy: true, download: false, fullscreen: false },
  }}
  markdown={text}
/>
```

## Public API

### Component

```ts
interface VelomarkProps {
  allowedTags?: AllowedTags;
  animated?: AnimateOptions | boolean;
  caret?: "block" | "circle";
  children?: JSX.Element;
  class?: string;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  controls?: ControlsConfig;
  debug?: boolean;
  dir?: "auto" | "ltr" | "rtl";
  icons?: Partial<IconMap>;
  lineNumbers?: boolean;
  linkSafety?: boolean;
  literalTagContent?: string[];
  markdown: string;
  onAnimationEnd?: () => void;
  onAnimationStart?: () => void;
  onDebugMetrics?: (metrics: VelomarkDebugMetrics) => void;
  plugins?: PluginConfig;
  remend?: RemendOptions;
  translations?: Partial<VelomarkTranslations>;
}
```

### Key exported types

```ts
import type {
  AnimateOptions,
  ControlsConfig,
  InlineToken,
  PluginConfig,
  RenderBlock,
  RenderDocument,
  VelomarkCaret,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
  VelomarkDebugMetrics,
  VelomarkProps,
} from "@velomark/core";
```

### Context providers

```ts
import { VelomarkProvider, useVelomark } from "@velomark/core";
import { BlockProvider, useBlock } from "@velomark/core";
```

### Utilities

```ts
import { parseInline, LinkSafetyModal } from "@velomark/core";
import { defaultTranslations } from "@velomark/core";
import { defaultIcons } from "@velomark/core";
```

## Security and trust model

Velomark supports raw HTML and structured HTML rendering. If your Markdown source is untrusted, sanitize it before you pass it into `Velomark`.

For link safety, enable the `linkSafety` prop to show a confirmation modal before navigating to external URLs.

This package focuses on rendering and streaming behavior. It does not try to be an HTML sanitizer.

## Troubleshooting

### The Markdown renders with no styling

You probably forgot the stylesheet import:

```ts
import "@velomark/core/styles.css";
```

Also ensure your Tailwind v4 setup includes the `@source` directive for Velomark's dist output.

### Code fences render without syntax highlighting

Check these first:

- the `@velomark/code` plugin is installed and passed in `plugins`
- the fence has a language, for example ` ```ts `
- `codeBlockOptions.highlight` is not disabled
- the requested language is supported by Shiki

Unlabeled fences intentionally render as plain code.

### Mermaid falls back to source

That is expected when:

- the `@velomark/mermaid` plugin is not installed
- the fence is still streaming and incomplete
- the Mermaid source is invalid
- Mermaid cannot finish rendering the diagram

### Math does not render

Make sure the `@velomark/math` plugin is installed and passed in `plugins`.

### The consumer gets a Solid peer dependency warning

Make sure the app uses `solid-js` `^1.9.10` or newer within the supported major range.

## FAQ

### Is Velomark a full CommonMark or GFM engine?

Not in the abstract "everything Markdown supports" sense. It targets the syntax and rendered surface that matter most for streamed AI and coding-assistant output, and it has strong coverage for that subset.

### Does it support React, Vue, or Svelte?

No. Velomark is intentionally Solid-only.

### Can I override rendering?

Yes, via:

- `codeBlockRenderers` — custom renderers for specific fenced code languages
- `containers` — custom renderers for directive containers
- `plugins.renderers` — custom fenced-code renderers (alternate API)
- Theme overrides via CSS custom properties
- `onDebugMetrics` — observe rendering performance

### How do I handle i18n?

Pass a `translations` object with your translated strings, or extend the `defaultTranslations`:

```tsx
<Velomark
  markdown={text}
  translations={{
    copy: "Copier",
    copied: "Copié",
  }}
/>
```

## Development

```bash
pnpm install
vp dev apps/docs     # start the playground dev server
vp run -r test       # run tests across all packages
vp check             # format, lint, and type-check
vp run -r build      # build all packages
```

The playground runs on port 3000 and includes fixture presets, stream simulation, benchmarking, and theme previews.

[^incremark]: Velomark is inspired by the renderer goals and streaming ergonomics explored in Incremark, while keeping a smaller Solid-only public surface.
