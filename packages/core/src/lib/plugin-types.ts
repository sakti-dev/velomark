import type { Component } from "solid-js";

export interface HighlightToken {
  bgColor?: string;
  color?: string;
  content: string;
  htmlAttrs?: Record<string, string>;
  htmlStyle?: Record<string, string>;
  offset?: number;
}

export interface HighlightResult {
  bg?: string;
  fg?: string;
  rootStyle?: string | false;
  tokens: HighlightToken[][];
}

export interface HighlightOptions {
  code: string;
  language: string;
  themes: [unknown, unknown];
}

export interface CodeHighlighterPlugin {
  getSupportedLanguages: () => string[];
  getThemes: () => [unknown, unknown];
  highlight: (
    options: HighlightOptions,
    callback?: (result: HighlightResult) => void,
  ) => HighlightResult | null;
  name: "shiki";
  supportsLanguage: (language: string) => boolean;
  type: "code-highlighter";
}

export interface MermaidInstance {
  initialize: (config: unknown) => void;
  render: (id: string, source: string) => Promise<{ svg: string }>;
}

export interface DiagramPlugin {
  getMermaid: (config?: unknown) => MermaidInstance;
  language: string;
  name: "mermaid";
  type: "diagram";
}

export interface MathRenderResult {
  html: string;
}

export interface MathRendererPlugin {
  getStyles?: () => string;
  name: "katex";
  render: (tex: string, displayMode: boolean) => MathRenderResult | null;
  type: "math";
}

export interface CjkPlugin {
  name: "cjk";
  postPass?: (text: string) => string;
  prePass?: (input: string) => string;
  type: "cjk";
}

export interface CustomRendererProps {
  code: string;
  isIncomplete: boolean;
  language: string;
  meta?: string;
}

export interface CustomRenderer {
  component: Component<CustomRendererProps>;
  language: string | string[];
}

export interface PluginConfig {
  cjk?: CjkPlugin;
  code?: CodeHighlighterPlugin;
  math?: MathRendererPlugin;
  mermaid?: DiagramPlugin;
  renderers?: CustomRenderer[];
}
