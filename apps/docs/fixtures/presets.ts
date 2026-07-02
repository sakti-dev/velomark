import type { PlaygroundPreset } from "../types/playground";
import velomarkSolidExample from "./velomark-solid-example";
import mermaidStreamExample from "./mermaid-stream-example";

export const playgroundPresets: PlaygroundPreset[] = [
  {
    id: "velomark-solid-example",
    label: "Velomark Example",
    description: "Comprehensive example covering all Velomark features for renderer evaluation.",
    markdown: velomarkSolidExample,
  },
  {
    id: "mermaid-stream",
    label: "Mermaid Stream",
    description:
      "All mermaid diagram types (flowchart, sequence, state, journey, gantt, pie, mindmap) for testing render during simulate stream.",
    markdown: mermaidStreamExample,
  },
];
