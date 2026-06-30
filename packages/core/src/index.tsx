export { parseInline } from "./parser/inline-parser";
export type { VelomarkProps } from "./render/velomark";
export { Velomark } from "./render/velomark";
export { applyTheme, resolveTheme } from "./theme/apply-theme";
export { generateCssVars } from "./theme/generate-css-vars";
export type { PartialVelomarkTheme } from "./theme/merge-theme";
export { mergeTheme } from "./theme/merge-theme";
export {
  darkTheme,
  defaultTheme,
  velomarkColors,
  velomarkThemePresets,
  velomarkTokens,
} from "./theme/tokens";
export type { VelomarkTheme, VelomarkThemeName } from "./theme/types";
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
export { PluginProvider, usePlugins } from "./plugins/plugin-context";
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
} from "./plugins/types";
