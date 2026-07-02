# @velomark/math

KaTeX-based math rendering plugin for [Velomark](https://www.npmjs.com/package/@velomark/core).

## Installation

```bash
pnpm add @velomark/math @velomark/core
```

## Usage

```tsx
import { Velomark } from "@velomark/core";
import { createMathPlugin } from "@velomark/math";
import "@velomark/core/styles.css";

const math = createMathPlugin();

export function Example(props: { markdown: string }) {
  return <Velomark markdown={props.markdown} plugins={{ math }} />;
}
```

Renders inline math (`$...$`) and display math (`$$...$$`). The KaTeX stylesheet is bundled in `@velomark/core/styles.css`.

## Configuration

```tsx
const math = createMathPlugin({
  throwOnError: false,
  errorColor: "var(--color-muted-foreground)",
  strict: "ignore",
  macros: { "\\R": "\\mathbb{R}" },
});
```

## API

### `createMathPlugin(options?)` → `MathRendererPlugin`

| Option         | Type                                       | Default                           |
| -------------- | ------------------------------------------ | --------------------------------- |
| `errorColor`   | `string`                                   | `"var(--color-muted-foreground)"` |
| `macros`       | `Record<string, string>`                   | —                                 |
| `output`       | `"html" \| "mathml" \| "htmlAndMathml"`    | —                                 |
| `strict`       | `boolean \| "error" \| "warn" \| "ignore"` | —                                 |
| `throwOnError` | `boolean`                                  | `false`                           |
| `trust`        | `boolean`                                  | —                                 |

Returns `{ html }` on success or `null` on render error. Also exports a pre-configured `math` instance.
