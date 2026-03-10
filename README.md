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
- KaTeX-backed math rendering with safe fallback for invalid or incomplete formulas
- directives and HTML handling
- Mermaid rendering with built-in diagram preview and source fallback
- syntax-highlighted fenced code blocks
- streaming edge-case corpus for incomplete intermediate snapshots
- parity corpus for render-surface regression coverage

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
- syntax highlighting for supported fenced languages
- built-in diagram preview for Mermaid fences

Mermaid blocks intentionally simplify the shared shell:

- no copy button
- no source/preview toggle
- automatic source fallback when diagram rendering fails

### Extension seams

- `codeBlockRenderers`
  - override a language-specific code block renderer
- `containers`
  - override directive/container rendering by name
- `onDebugMetrics`
  - consume block reuse metrics for diagnostics

## Supported syntax

See [docs/feature-matrix.md](./docs/feature-matrix.md).

## Parity corpus

`velomark` keeps a dedicated parity corpus under `test/fixtures/parity/` for the
remaining Incremark-aligned render surface. These fixtures are used to lock:

- math fixtures
- nested HTML fixtures
- directive fixtures
- streamed code-growth fixtures

The parity harness is intentionally semantic. It asserts rendered structure and
streaming resilience rather than library-internal CSS details. It also covers
streamed code growth so highlight-enabled code blocks keep a stable outer shell
while the code body updates.

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

The playground deliberately mirrors the desktop app theme contract:

- it reuses the desktop token CSS values
- it uses the same `.dark` root-class toggle model
- it keeps the desktop markdown preview contract around the rendered surface

This is a preview and evaluation aid for renderer work. It does **not** mean the
published library depends on the desktop app at runtime.

## Scope boundary

`velomark` is a generic Solid renderer, not a desktop-app UI kit.
Desktop-specific styling, wrappers, and workflow UI stay in the consumer integration layer.
The playground is the one deliberate exception: it is allowed to borrow the desktop
theme contract so renderer changes can be judged in a realistic preview environment.
