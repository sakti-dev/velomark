# velomark

Solid-only markdown rendering tuned for streamed AI responses.

`velomark` is built for coding-agent style output first:

- append-heavy streaming
- stable DOM identity for earlier blocks
- targeted block reuse instead of full subtree replacement
- package-consumer compatibility without app-specific alias hacks
- generic built-in defaults with a restrained public API surface

## Status

This package is in active development, but the core renderer surface is real and tested:

- semantic block and inline rendering
- reference-style links and images
- footnotes
- math fallback rendering
- directives and HTML handling
- Mermaid rendering with preview/source defaults
- streaming edge-case corpus for incomplete intermediate snapshots

## Install

```bash
pnpm add velomark solid-js
```

Import the package and the shipped stylesheet:

```ts
import { Velomark } from "velomark";
import "velomark/styles.css";
```

## Basic usage

```tsx
import { Velomark } from "velomark";

export function Example() {
  return <Velomark markdown={"# Hello\n\n```ts\nconst answer = 42;\n```"} />;
}
```

## Public API

### `Velomark`

```ts
interface VelomarkProps {
  class?: string;
  codeBlockOptions?: {
    copyButton?: boolean;
    defaultView?: "preview" | "source";
    languageLabel?: boolean;
    previewToggle?: boolean;
  };
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  markdown: string;
  onDebugMetrics?: (metrics: VelomarkDebugMetrics) => void;
}
```

### Built-in defaults

By default, `velomark` enables generic code block UX:

- language labels when a language exists
- copy button on code blocks
- preview/source toggle for built-in preview-capable blocks like Mermaid
- preview as the default Mermaid view

### Extension seams

- `codeBlockRenderers`
  - override a language-specific code block renderer
- `containers`
  - override directive/container rendering by name
- `onDebugMetrics`
  - consume block reuse metrics for diagnostics

## Supported syntax

See [docs/feature-matrix.md](./docs/feature-matrix.md).

## Development

```bash
pnpm install --ignore-workspace
pnpm test
pnpm build
```

## Playground

The local dev app is the main place to inspect streamed rendering behavior:

```bash
pnpm dev
```

Use the playground to:

- replay append-heavy streaming
- compare append and rewrite benchmark paths
- inspect DOM reuse metrics
- probe whether interaction stays stable under long streamed output

## Scope boundary

`velomark` is a generic Solid renderer, not a desktop-app UI kit.
Desktop-specific styling, wrappers, and workflow UI stay in the consumer integration layer.
