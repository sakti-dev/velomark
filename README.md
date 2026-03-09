# velomark

Solid-only markdown rendering tuned for streamed AI responses.

`velomark` is being built for coding-agent style output first:

- append-heavy streaming
- stable DOM identity for earlier blocks
- minimal markdown subset instead of full CommonMark from day one
- package-consumer compatibility without app-specific alias hacks

## Status

This package is in active development. The current baseline exports a single
`Velomark` component while the internal block model, patch planner, and
streaming-focused renderer are being implemented.

## Development

```bash
pnpm install --ignore-workspace
pnpm test
pnpm build
```
