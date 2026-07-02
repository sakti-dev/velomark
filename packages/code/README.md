# @velomark/code

Shiki-based syntax highlighting plugin for [Velomark](https://www.npmjs.com/package/@velomark/core).

## Installation

```bash
pnpm add @velomark/code @velomark/core
```

## Usage

```tsx
import { Velomark } from "@velomark/core";
import { createCodePlugin } from "@velomark/code";
import "@velomark/core/styles.css";

const code = createCodePlugin();

export function Example(props: { markdown: string }) {
  return <Velomark markdown={props.markdown} plugins={{ code }} />;
}
```

## Configuration

### Custom themes

Defaults to `github-light` / `github-dark`. Pass any Shiki `BundledTheme` or custom `ThemeRegistration`:

```tsx
const code = createCodePlugin({
  themes: ["vitesse-light", "vitesse-dark"],
});
```

## API

### `createCodePlugin(options?)` → `CodeHighlighterPlugin`

Creates a Shiki highlighter with async language loading, singleton highlighter caching, and token caching.

| Option   | Type                       | Default                           |
| -------- | -------------------------- | --------------------------------- |
| `themes` | `[ThemeInput, ThemeInput]` | `["github-light", "github-dark"]` |

**Methods:**

- `highlight({ code, language, themes }, callback?)` — returns cached tokens synchronously, or `null` + async `callback` when loading
- `supportsLanguage(lang)` — checks if a language is bundled
- `getSupportedLanguages()` — lists all bundled languages
- `getThemes()` — returns configured themes

Language aliases are resolved automatically (e.g. `ts` → `typescript`). Unsupported or truncated languages fall back to `text`.

A pre-configured `code` instance is also exported.
