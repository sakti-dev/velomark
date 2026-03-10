export { Velomark } from "./render/velomark";
export { parseInline } from "./parser/inline-parser";
export { applyTheme, resolveTheme } from "./theme/apply-theme";
export { generateCssVars } from "./theme/generate-css-vars";
export { mergeTheme } from "./theme/merge-theme";
export {
  darkTheme,
  defaultTheme,
  velomarkColors,
  velomarkThemePresets,
  velomarkTokens,
} from "./theme/tokens";
export type { PartialVelomarkTheme } from "./theme/merge-theme";
export type { VelomarkTheme, VelomarkThemeName } from "./theme/types";
export type { VelomarkProps } from "./render/velomark";
export type {
  InlineToken,
  RenderBlock,
  RenderDocument,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
} from "./types";
