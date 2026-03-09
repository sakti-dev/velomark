export type RenderBlockKind =
  | "paragraph"
  | "heading"
  | "code"
  | "blockquote"
  | "list"
  | "thematic-break"
  | "table"
  | "fallback";

export type RenderBlockStatus = "streaming" | "complete";

export interface RenderBlock<TData = unknown> {
  data: TData;
  fingerprint: string;
  id: string;
  kind: RenderBlockKind;
  sourceEnd: number;
  sourceStart: number;
  status: RenderBlockStatus;
}

export interface RenderDocument<TData = unknown> {
  blocks: RenderBlock<TData>[];
  version: number;
}
