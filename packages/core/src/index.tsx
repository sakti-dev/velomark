export { parseInline } from "./lib/parser/inline-parser";
export type { VelomarkProps } from "./render/velomark";
export { Velomark } from "./render/velomark";
export type {
  InlineToken,
  RenderBlock,
  RenderDocument,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
  VelomarkDebugMetrics,
} from "./types";

// Plugin contract (feature packages register via <Velomark plugins={...}>)
export { PluginProvider, usePlugins } from "./lib/plugin-context";
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
