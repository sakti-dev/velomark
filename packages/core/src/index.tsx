export { parseInline } from "./lib/parser/inline-parser";
export type { VelomarkProps } from "./render/velomark";
export { Velomark } from "./render/velomark";
export { LinkSafetyModal } from "./render/compat/link-safety-modal";
export type {
  ControlsConfig,
  InlineToken,
  RenderBlock,
  RenderDocument,
  VelomarkCaret,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
  VelomarkDebugMetrics,
} from "./types";

// Context providers
export { VelomarkProvider, useVelomark } from "./lib/velomark-context";
export { BlockProvider, useBlock } from "./lib/block-context";
export type { VelomarkStore, AllowedTags } from "./lib/velomark-context";
export type { BlockStore } from "./lib/block-context";
export type { AnimateOptions } from "./types";
export type { VelomarkTranslations } from "./lib/translations";
export { defaultTranslations } from "./lib/translations";
export type { IconMap, IconComponent } from "./render/icons";
export { defaultIcons } from "./render/icons";

// Remend self-healing markdown
export type { RemendOptions } from "remend";

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
