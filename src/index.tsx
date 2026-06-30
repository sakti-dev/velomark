export { parseInline } from "./core/parser/inline-parser";
export type { VelomarkProps } from "./core/render/velomark";
export { Velomark } from "./core/render/velomark";
export { applyTheme, resolveTheme } from "./core/theme/apply-theme";
export { generateCssVars } from "./core/theme/generate-css-vars";
export type { PartialVelomarkTheme } from "./core/theme/merge-theme";
export { mergeTheme } from "./core/theme/merge-theme";
export {
  darkTheme,
  defaultTheme,
  velomarkColors,
  velomarkThemePresets,
  velomarkTokens,
} from "./core/theme/tokens";
export type { VelomarkTheme, VelomarkThemeName } from "./core/theme/types";
export type {
  InlineToken,
  RenderBlock,
  RenderDocument,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
} from "./core/types";
