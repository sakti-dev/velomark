export interface PlaygroundPreset {
  id:
    | "agent-replay"
    | "incremark-solid-example"
    | "recorded-chat-replay"
    | "chat-response"
    | "mermaid-gallery"
    | "code-heavy"
    | "list-table"
    | "mixed-long";
  label: string;
  description: string;
  markdown: string;
}

export type PlaygroundStreamMode = "append" | "rewrite-tail";

export interface PlaygroundStreamControls {
  chunkSize: number;
  intervalMs: number;
  mode: PlaygroundStreamMode;
}

export interface PlaygroundBenchmarkResult {
  appendedBlockCount: number;
  averageUpdateMs: number;
  maxUpdateMs: number;
  mode: PlaygroundStreamMode;
  replacedBlockCount: number;
  reusedBlockCount: number;
  updates: number;
}

export interface PlaygroundBenchmarkState {
  completedRuns: number;
  isRunning: boolean;
  results: PlaygroundBenchmarkResult[];
  totalRuns: number;
}
