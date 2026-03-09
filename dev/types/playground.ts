export interface PlaygroundPreset {
  id: "chat-response" | "code-heavy" | "list-table" | "mixed-long";
  label: string;
  description: string;
  markdown: string;
}

export type PlaygroundStreamMode = "append" | "rewrite-tail";
