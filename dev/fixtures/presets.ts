import type { PlaygroundPreset } from "../types/playground";
import incremarkSolidExample from "./incremark-solid-example";
import recordedChatReplay from "./recorded-chat-replay";

const agentReplay = `# Agent Replay Stress Sample

This preset is intentionally long and shaped like a coding-agent response so replay, selection, and hover behavior stay visible for more than a few frames.

## Session Summary

The assistant explored a monorepo workspace, inspected task-session workflow files, compared prompt strategies, and then migrated the markdown renderer away from Incremark toward a purpose-built Solid-only renderer package named \`velomark\`.

## Why This Preset Exists

- The playground needs a stress sample closer to real coding-agent output.
- Short markdown examples complete too quickly and hide update costs.
- Long prefix stability is what exposes selection-loss bugs.
- Mixed content reveals whether only the suffix is replaced during rewrites.

## Observed Workflow

1. Research the repository structure and active specs.
2. Review prompt architecture and tool selection behavior.
3. Investigate doom-loop detection and repeated file reads.
4. Redesign read batching, workflow actions, and task-session resume state.
5. Build a custom streaming renderer with stable block identity.
6. Validate the packaged library from a clean consumer path.

## Long-Form Architectural Notes

The coding-agent workflow favors append-heavy updates. The first blocks of an answer often contain problem framing, tradeoffs, and explicit findings. Those blocks should remain stable while later sections such as implementation details, verification steps, and follow-up actions continue to stream in.

That means the renderer needs to preserve DOM identity for earlier blocks rather than remounting the entire markdown tree. If a user is hovering a file reference or selecting text in the first section of a reply, later paragraph and code-fence updates should not destroy that interaction state.

In practice, the render document should treat a long answer as a sequence of stable blocks. When the answer grows by appending a new paragraph or a new code fence, the renderer should attach only the new suffix blocks. When the answer changes near the tail, only the changed suffix should be replaced. Prefix reuse is the central performance invariant.

## Example Findings

### Prompting

- Tool descriptions should be procedural for weaker models.
- Primary workflow actions must be server-owned.
- The model may suggest secondary actions, but it should not invent mandatory next steps.
- Review gates should remain explicit even when the UX is simplified into friendlier checkpoints.

### Workflow State

- Task sessions need durable runtime mode persistence.
- Resume should come from canonical workflow state, not blind chat reconstruction.
- A reopened task session should restore checkpoint summaries and next actions through the server.
- Intake sessions do not need the same persistence model because they are intentionally disposable scratch space.

### Rendering

- Append-first streaming is the hot path.
- Reasoning should stream as deltas too if the upstream protocol already emits deltas.
- Snapshot reconstruction belongs in state, not on the wire.
- Renderer components should update only the blocks that actually changed.

## Example Code

\`\`\`ts
interface WorkflowSnapshot {
  currentStage: "research" | "scope" | "technical-plan" | "work-plan" | "build";
  primaryActions: string[];
  secondaryActions: string[];
  handoffSummary: string;
}

function resumeFromSnapshot(snapshot: WorkflowSnapshot): string {
  return [
    \`Current stage: \${snapshot.currentStage}\`,
    \`Primary actions: \${snapshot.primaryActions.join(", ")}\`,
    \`Secondary actions: \${snapshot.secondaryActions.join(", ")}\`,
    snapshot.handoffSummary,
  ].join("\\n");
}
\`\`\`

## Comparative Table

| Concern | Naive Snapshot Renderer | Stable Block Renderer |
| --- | --- | --- |
| Early block hover | Often lost | Preserved |
| Text selection | Often reset | Preserved on append |
| Tail rewrite cost | Full subtree churn | Suffix-only replacement |
| Streaming feel | Janky under long output | Predictable and incremental |
| Packaged consumer compatibility | Toolchain-dependent | Explicitly validated |

## Extended Discussion

A realistic coding-agent answer rarely stops after two short paragraphs. It keeps growing through findings, tradeoffs, file references, code snippets, and verification output. The stress preset should reflect that actual rhythm instead of a minimal markdown demo because renderer defects only become obvious when the transcript is long enough to scroll, select, and revisit.

The most important behavioral checks are not abstract microbenchmarks. They are user-facing interaction guarantees:

- Can the user select text in the first block and keep that selection while the answer grows?
- Can the user hover a link or code span without the element being remounted away?
- Can the renderer append late code fences without disturbing earlier headings and lists?
- Can the system report block reuse clearly enough that regressions are easy to spot?

## More Structured Content

> Stable prefix blocks are the entire point. If the renderer cannot preserve them, the rest of the optimization story is weak.

### Checklist

- Preserve stable block IDs across append-only updates.
- Preserve DOM nodes for unchanged prefix blocks.
- Replace only the rewritten suffix on tail edits.
- Stream both answer text and reasoning as deltas.
- Validate the package from a clean consumer install path.
- Keep the playground large enough to make regressions obvious.

### Additional Table

| Metric | Append Path | Rewrite Tail |
| --- | --- | --- |
| Reused Blocks | High | Medium |
| Replaced Blocks | Low | Medium |
| Appended Blocks | High | Low |
| Selection Stability | Strong | Depends on rewrite location |

## Final Notes

This preset deliberately exceeds the size of the old toy samples. It is not trying to be elegant. It is trying to expose the real renderer behavior that matters for streamed AI responses in the desktop app.

Use this preset first when evaluating:

1. selection stability
2. hover retention
3. append smoothness
4. rewrite-tail behavior
5. benchmark panel usefulness
`;

const chatResponse = `# Project Overview

Velomark is a Solid-only markdown renderer tuned for streamed AI responses.
It prioritizes stable block identity so earlier selections and hover targets stay intact while later blocks append.

## Current Focus

- Append-heavy response rendering
- Predictable tail rewrites
- Package-level consumer compatibility
- Measurable DOM reuse during replay
`;

const mermaidGallery = `# Mermaid Gallery

This preset exists to exercise the built-in Mermaid preview and source modes across multiple diagram families.

## Flowchart

\`\`\`mermaid
flowchart TD
  Request[User request] --> Research[Research context]
  Research --> Plan[Plan the work]
  Plan --> Build[Implement]
  Build --> Verify[Verify and review]
\`\`\`

## Sequence Diagram

\`\`\`mermaid
sequenceDiagram
  participant User
  participant Desktop
  participant Server
  participant Agent
  User->>Desktop: Submit prompt
  Desktop->>Server: Stream chat request
  Server->>Agent: Execute tools
  Agent-->>Server: Delta events
  Server-->>Desktop: Stream response
  Desktop-->>User: Update viewport
\`\`\`

## Class Diagram

\`\`\`mermaid
classDiagram
  class RenderDocument {
    +blocks: RenderBlock[]
    +definitions: ReferenceDefinitionMap
    +version: number
  }
  class RenderBlock {
    +id: string
    +kind: string
    +fingerprint: string
  }
  RenderDocument --> RenderBlock
\`\`\`

## State Diagram

\`\`\`mermaid
stateDiagram-v2
  [*] --> Research
  Research --> Scope
  Scope --> TechnicalPlan
  TechnicalPlan --> WorkPlan
  WorkPlan --> Build
  Build --> [*]
\`\`\`

## ER Diagram

\`\`\`mermaid
erDiagram
  TASK_SESSION ||--o{ PROJECT_KEYPOINT : creates
  TASK_SESSION {
    string id
    string runtimeMode
    string status
  }
  PROJECT_KEYPOINT {
    string id
    string milestone
    string summary
  }
\`\`\`

## Journey

\`\`\`mermaid
journey
  title Manual renderer review
  section Playground
    Load replay preset: 5: User
    Toggle Mermaid preview: 4: User
    Copy code block: 4: User
  section Confidence
    Verify selection stability: 5: User
    Check packed consumer build: 4: Maintainer
\`\`\`

## Gantt

\`\`\`mermaid
gantt
  title Velomark roadmap slice
  dateFormat  YYYY-MM-DD
  section Core
  Syntax parity         :done,    syntax, 2026-03-08, 2d
  Code block UX         :active,  ux,     2026-03-10, 2d
  Edge-case corpus      :         corpus, 2026-03-12, 2d
\`\`\`

## Mindmap

\`\`\`mermaid
mindmap
  root((Velomark))
    Streaming
      Append-first
      Stable identity
      Suffix-only rewrites
    Syntax
      Tables
      Footnotes
      Directives
      Mermaid
    UX
      Copy
      Preview
      Source
\`\`\`

## Pie

\`\`\`mermaid
pie title Renderer focus
  \"Streaming correctness\" : 45
  \"Syntax coverage\" : 30
  \"Public ergonomics\" : 25
\`\`\`
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
    id: "agent-replay",
    label: "Agent Replay",
    description:
      "Long-form coding-agent stress sample for replay, metrics, and selection stability.",
    markdown: agentReplay,
  },
  {
    id: "chat-response",
    label: "Chat Response",
    description: "General coding-agent explanation with headings and paragraphs.",
    markdown: chatResponse,
  },
  {
    id: "incremark-solid-example",
    label: "Incremark Example",
    description:
      "Copied from the Incremark Solid example sample so renderer behavior can be compared on the same long-form content.",
    markdown: incremarkSolidExample,
  },
  {
    id: "mermaid-gallery",
    label: "Mermaid Gallery",
    description:
      "Multiple Mermaid diagram families to exercise preview, source mode, and long-scroll rendering.",
    markdown: mermaidGallery,
  },
  {
    id: "recorded-chat-replay",
    label: "Recorded Replay",
    description:
      "Markdown reconstructed from a real desktop chat stream fixture using the extractor script.",
    markdown: recordedChatReplay,
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
