import type { PlaygroundPreset } from "../types/playground";

const chatResponse = `# Project Overview

Velomark is a Solid-only markdown renderer tuned for streamed AI responses.
It prioritizes stable block identity so earlier selections and hover targets stay intact while later blocks append.

## Current Focus

- Append-heavy response rendering
- Predictable tail rewrites
- Package-level consumer compatibility
- Measurable DOM reuse during replay
`;

const codeHeavy = `# Streamed Patch Example

The renderer should preserve earlier blocks while later code arrives.

\`\`\`ts
export function appendChunk(previous: string, chunk: string): string {
  return previous + chunk;
}
\`\`\`

## Notes

- Code fences should remain readable during replay.
- Inline \`code\` should keep simple semantics.
- Tail rewrites should only replace the affected suffix.
`;

const listTable = `# Checklist And Summary

## Requirements

- Stable DOM identity for unchanged blocks
- Fast append-only replay
- Predictable replacement behavior for tail edits
- Clear metrics for reused and replaced blocks

## Comparison

| Mode | Reused Blocks | Replaced Blocks |
| --- | --- | --- |
| Append | High | Low |
| Rewrite Tail | Medium | Medium |
| Full Reset | Low | High |
`;

const mixedLong = `# Long Mixed Response

Velomark should feel good on realistic coding-agent output, not just tiny markdown samples.

> Earlier explanation blocks should remain stable while the answer continues to grow.

## Implementation Direction

1. Build a render document from the latest markdown snapshot.
2. Reuse unchanged prefix blocks with stable IDs.
3. Replace only the changed suffix when the tail is rewritten.

### Example

A renderer viewport should support paragraphs, lists, code blocks, and tables in one long transcript.

\`\`\`ts
const metrics = {
  reusedBlockCount: 8,
  replacedBlockCount: 1,
  appendedBlockCount: 2,
};
\`\`\`

| Metric | Meaning |
| --- | --- |
| \`reusedBlockCount\` | Earlier blocks preserved |
| \`replacedBlockCount\` | Blocks that lost identity |
| \`appendedBlockCount\` | New blocks added at the tail |

Final note: this sample is intentionally long enough to make replay and selection feel meaningful in the playground.
`;

export const playgroundPresets: PlaygroundPreset[] = [
  {
    id: "chat-response",
    label: "Chat Response",
    description: "General coding-agent explanation with headings and paragraphs.",
    markdown: chatResponse,
  },
  {
    id: "code-heavy",
    label: "Code Heavy",
    description: "Paragraphs mixed with fenced code blocks and inline code.",
    markdown: codeHeavy,
  },
  {
    id: "list-table",
    label: "List + Table",
    description: "Lists and tables for structure-heavy renderer checks.",
    markdown: listTable,
  },
  {
    id: "mixed-long",
    label: "Mixed Long",
    description: "Long mixed transcript for replay and stability checks.",
    markdown: mixedLong,
  },
];
