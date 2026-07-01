export { parseInline } from "./lib/parser/inline-parser";
export type { VelomarkProps } from "./render/velomark";
export { Velomark } from "./render/velomark";
export { LinkSafetyModal } from "./render/compat/link-safety-modal";
export type {
  InlineToken,
  RenderBlock,
  RenderDocument,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
  VelomarkDebugMetrics,
} from "./types";

// Context providers
export { VelomarkProvider, useVelomark } from "./lib/velomark-context";
export { BlockProvider, useBlock } from "./lib/block-context";
export type { VelomarkStore } from "./lib/velomark-context";
export type { BlockStore } from "./lib/block-context";
export type { AnimateOptions } from "./types";

// Plugin contract (feature packages register via <Velomark plugins={...}>)
export type {
  CjkPlugin,
  CodeHighlighterPlugin,
  CustomRenderer,
  CustomRendererProps,
  DiagramPlugin,
  HighlightOptions,
  HighlightResult,
  HighlightToken,
  MathRenderResult,
  MathRendererPlugin,
  MermaidInstance,
  PluginConfig,
} from "./lib/plugin-types";
