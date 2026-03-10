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

export interface InlineCodeToken {
  text: string;
  type: "code";
}

export interface InlineEmphasisToken {
  children: InlineToken[];
  type: "emphasis";
}

export interface InlineDeleteToken {
  children: InlineToken[];
  type: "delete";
}

export interface InlineImageToken {
  alt: string;
  src: string;
  type: "image";
}

export interface InlineLinkToken {
  children: InlineToken[];
  href: string;
  type: "link";
}

export interface InlineStrongToken {
  children: InlineToken[];
  type: "strong";
}

export interface InlineTextToken {
  text: string;
  type: "text";
}

export type InlineToken =
  | InlineCodeToken
  | InlineDeleteToken
  | InlineEmphasisToken
  | InlineImageToken
  | InlineLinkToken
  | InlineStrongToken
  | InlineTextToken;

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

export interface VelomarkDebugMetrics {
  appendedBlockCount: number;
  blockCount: number;
  replacedBlockCount: number;
  reusedBlockCount: number;
}
