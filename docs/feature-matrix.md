# Velomark Feature Matrix

This matrix describes the current tested renderer surface.

## Legend

- `Supported`: intended public behavior, covered by tests
- `Partial`: works for the current supported subset but is intentionally narrower than a full general-purpose markdown engine
- `Out of scope`: intentionally not part of the current package goals

## Block syntax

| Feature | Status | Notes |
| --- | --- | --- |
| Paragraphs | Supported | Semantic `<p>` output |
| Headings | Supported | Semantic heading tags |
| Blockquotes | Supported | Preserves paragraph structure |
| Ordered / unordered lists | Supported | Includes nested child lists |
| Task lists | Supported | Disabled checkbox output |
| Fenced code blocks | Supported | Generic shell with built-in defaults |
| Mermaid fences | Supported | Built-in preview/source path with fallback |
| Tables | Supported | Includes column alignment support |
| Thematic breaks | Supported | Semantic `<hr>` |
| Footnote definitions | Supported | Document footnote section rendered |
| Block math | Supported | Safe fallback shell |
| Raw block HTML | Supported | Safe source-shell rendering |
| Structured HTML block elements | Supported | Parsed for simple supported elements |
| Container directives | Supported | Generic container rendering |
| Leaf directives | Supported | Generic standalone directive rendering |

## Inline syntax

| Feature | Status | Notes |
| --- | --- | --- |
| Text | Supported | |
| Strong / emphasis / delete | Supported | `**`, `__`, `*`, `_`, `~~` |
| Inline code | Supported | |
| Hard line breaks | Supported | Two-space and backslash forms |
| Links | Supported | External links render with safe attributes |
| Images | Supported | Lazy-loaded `<img>` |
| Reference-style links/images | Supported | Explicit, collapsed, and shortcut forms |
| Footnote references | Supported | Superscript backlink references |
| Inline math | Supported | Safe fallback shell |
| Raw inline HTML | Supported | Direct inline HTML rendering |
| Structured inline HTML elements | Supported | Parsed for simple supported elements |
| Text directives | Supported | Generic inline directive rendering |

## Streaming behavior

| Behavior | Status | Notes |
| --- | --- | --- |
| Append-heavy streaming | Supported | Primary optimization target |
| Stable prefix DOM identity | Supported | Core renderer behavior |
| Rewrite-tail streaming | Supported | Used in the playground and regression coverage |
| Incomplete streamed fences | Supported | Covered by streaming corpus |
| Late-arriving reference definitions | Supported | Covered by streaming corpus |
| Incomplete directives | Supported | Covered by streaming corpus |
| Incomplete HTML | Supported | Covered by streaming corpus |
| Incomplete tables | Supported | Covered by streaming corpus |

## Public API surface

| Surface | Status | Notes |
| --- | --- | --- |
| `Velomark` component | Supported | Primary entrypoint |
| `codeBlockOptions` | Supported | Small default-UX config surface |
| `codeBlockRenderers` | Supported | Language override map |
| `containers` | Supported | Container/directive override map |
| `onDebugMetrics` | Supported | Diagnostics hook |
| Broad global component-map API | Out of scope | Avoided intentionally for now |
| Framework-agnostic core package | Out of scope | `velomark` is Solid-only |

## Current partial areas

| Feature | Status | Notes |
| --- | --- | --- |
| Full CommonMark / GFM parity | Partial | Focus is streamed AI-response subset correctness |
| HTML element parsing depth | Partial | Simple supported element structures only |
| Mermaid UX richness | Partial | Preview/source path exists; not a full diagram IDE |
| General-purpose markdown library ergonomics | Partial | Public API remains intentionally small |
