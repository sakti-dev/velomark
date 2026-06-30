# Velomark → Streamdown-Structured Monorepo

**Date:** 2026-07-01 · **Status:** planning · **Branch:** `feat/streamdown-parity`

> Supersedes `2026-07-01-streamdown-parity.md`. The styling port (`2026-07-01-styling-tailwind-port.md`) folds in as a sub-task of Phase 2.

## Goal

Re-organize velomark into a real Vite+ monorepo that follows streamdown's package structure and plugin contract — **without giving up velomark's performance edge.** The engine (hand-written parser + Solid fine-grained render + block-level patching) stays; streamdown's structure, extensibility model, and feature richness come in on top.

## Key decisions (approved)

1. **Engine stays.** Keep velomark's hand-written parser, `RenderDocument` IR, Solid patcher — that's where the speed lives. Do **not** adopt `unified`/remark/rehype.
2. **Follow streamdown's structure.** Real publishable monorepo + the typed `PluginConfig` contract + per-feature packages.
3. **`src/` coexists with `packages/`.** `src/` stays the live, published, green source of truth until `packages/` reaches parity, then `src/` is deleted. This keeps every step reversible.
4. **Velomark's differentiators stay core, always-on:** directives (`:::`/`::`/`:`), footnotes, `onDebugMetrics`, stable IDs.

## Package set

| Package            | npm name            | Origin                           | Port                                  |
| ------------------ | ------------------- | -------------------------------- | ------------------------------------- |
| `packages/core`    | `velomark`          | velomark engine, reorganized     | re-architect (expose plugin contract) |
| `packages/remend`  | `@velomark/remend`  | streamdown `remend`              | near-verbatim (framework-agnostic TS) |
| `packages/code`    | `@velomark/code`    | streamdown `@streamdown/code`    | ~1:1 (Shiki capability)               |
| `packages/mermaid` | `@velomark/mermaid` | streamdown `@streamdown/mermaid` | ~1:1 (Mermaid capability)             |
| `packages/math`    | `@velomark/math`    | streamdown `@streamdown/math`    | re-implement (remark→velomark pass)   |
| `packages/cjk`     | `@velomark/cjk`     | streamdown `@streamdown/cjk`     | re-implement (remark→velomark pass)   |

## Plugin contract (velomark's adaptation)

Adopt streamdown's `PluginConfig` slot pattern + discriminated-union types. Code & mermaid ports near-verbatim (pure capability objects). Math & cjk keep the _shape_ but replace unified `Pluggable` fields with velomark **parser-pass hooks** (velomark doesn't run unified).

- `PluginConfig = { code?, math?, mermaid?, cjk?, renderers? }`
- `CodeHighlighterPlugin`, `DiagramPlugin` → verbatim
- `MathPlugin`, `CjkPlugin` → adapted (parser-pass hooks instead of remark/rehype)

## Migration rule

While both exist: **`src/` is the published `velomark`** (root `pack` → `src/index.tsx`, tests green, untouched). **`packages/*` is built up** with its own tests + a `dev/` playground importing from `packages/`. **Cutover** = parity suite passes → flip root `pack` to `packages/core` → delete `src/`.

## Verification gates (every phase)

- `vp check` clean · `vp test` green
- Parity fixtures render identically to `src/`
- `onDebugMetrics` numbers don't regress vs `src/` baseline

---

## Roadmap

### Phase 0 — Workspace scaffolding ✅

- [x] Add `packages: ['packages/*']` to `pnpm-workspace.yaml`
- [x] Root → `velomark-monorepo` (private); `packages/core` → `velomark` skeleton (own `vite.config.ts` + smoke test); root keeps lint/fmt/staged/test
- [x] Root test globs expanded to cover `packages/**`
- [ ] Document the coexistence rule in root README (deferred)

### Phase 1 — `packages/core` (engine + contract)

- [ ] Port velomark engine into `packages/core` (parser, IR, Solid render, patcher, theme, GFM)
- [ ] Expose `PluginConfig` loader + contexts (`cn`, prefix, icon, translations)
- [ ] Keep directives + footnotes + `onDebugMetrics` always-on
- [ ] **Fold in the styling port:** components adopt streamdown's exact Tailwind classes + `@theme` bridge
- [ ] Core parity vs `src/` on the existing test suite

### Phase 2 — `packages/remend` (self-heal)

- [ ] Port streamdown `remend` near-verbatim (string-transform handlers)
- [ ] Wire into core's incomplete-block handling (streaming tail)
- [ ] Streaming edge-case tests pass (incl. the currently-failing one on `main`)

### Phase 3 — `packages/code` (Shiki)

- [ ] `CodeHighlighterPlugin` implementation
- [ ] Rich code-block UX (copy, language badge, line numbers, download) — streamdown classes, velomark's Solid structure

### Phase 4 — `packages/mermaid`

- [ ] `DiagramPlugin` implementation
- [ ] Pan-zoom / fullscreen / download (port streamdown's UX to Solid)

### Phase 5 — `packages/math` (KaTeX)

- [ ] Re-implement as velomark parser pass (lift syntax rules from streamdown's katex remark plugin)
- [ ] Inline + block; KaTeX error fallback

### Phase 6 — `packages/cjk`

- [ ] Re-implement as velomark pre/post parser passes (autolink boundaries, emphasis handling)

### Phase 7 — Parity, perf proof, cutover

- [ ] Parity suite: port `src/__tests__` + streamdown `__tests__` → all green on `packages/`
- [ ] Benchmark harness: velomark-engine vs streamdown on shared fixtures (prove perf held)
- [ ] Flip root `pack` → `packages/core`; update `./styles.css` export
- [ ] `dev/` playground wired to import from `packages/`
- [ ] Delete `src/`; update README + consumer docs

---

## Notes

- **Per-phase detail:** spawn a focused plan (writing-plans skill) when starting each phase — this doc is the tracker, not the task list.
- **`remend` before features:** it unblocks streaming correctness early, independent of the capability plugins.
- **Do NOT remove `color.diagram.*`** from the theme until `packages/mermaid` is ported (`to-mermaid-theme.ts` consumes it).
