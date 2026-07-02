# @velomark/mermaid

Mermaid diagram rendering plugin for [Velomark](https://www.npmjs.com/package/@velomark/core).

## Installation

```bash
pnpm add @velomark/mermaid @velomark/core
```

## Usage

```tsx
import { Velomark } from "@velomark/core";
import { createMermaidPlugin } from "@velomark/mermaid";
import "@velomark/core/styles.css";

const mermaid = createMermaidPlugin();

export function Example(props: { markdown: string }) {
  return <Velomark markdown={props.markdown} plugins={{ mermaid }} />;
}
```

Mermaid fences (` ```mermaid `) render as interactive diagrams with pan/zoom/fullscreen controls. Invalid or incomplete diagrams fall back to source code while streaming.

## Configuration

```tsx
const mermaid = createMermaidPlugin({
  config: {
    theme: "dark",
    securityLevel: "strict",
    fontFamily: "monospace",
  },
});
```

## API

### `createMermaidPlugin(options?)` → `DiagramPlugin`

| Option   | Type            | Default   |
| -------- | --------------- | --------- |
| `config` | `MermaidConfig` | See below |

**Default config:**

| Field                    | Default       |
| ------------------------ | ------------- |
| `startOnLoad`            | `false`       |
| `theme`                  | `"default"`   |
| `securityLevel`          | `"strict"`    |
| `fontFamily`             | `"monospace"` |
| `suppressErrorRendering` | `true`        |

Mermaid initializes lazily on first render. Also exports a pre-configured `mermaid` instance.
