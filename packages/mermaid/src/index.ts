import type { MermaidConfig } from "mermaid";
import mermaidLib from "mermaid";

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

export interface MermaidPluginOptions {
  config?: MermaidConfig;
}

const defaultConfig: MermaidConfig = {
  startOnLoad: false,
  theme: "default",
  securityLevel: "strict",
  fontFamily: "monospace",
  suppressErrorRendering: true,
};

export function createMermaidPlugin(options: MermaidPluginOptions = {}): DiagramPlugin {
  let initialized = false;
  let currentConfig: MermaidConfig = { ...defaultConfig, ...options.config };

  const mermaidInstance: MermaidInstance = {
    initialize(config: unknown) {
      currentConfig = { ...defaultConfig, ...options.config, ...(config as MermaidConfig) };
      mermaidLib.initialize(currentConfig);
      initialized = true;
    },
    async render(id: string, source: string) {
      if (!initialized) {
        mermaidLib.initialize(currentConfig);
        initialized = true;
      }
      return await mermaidLib.render(id, source);
    },
  };

  return {
    name: "mermaid",
    type: "diagram",
    language: "mermaid",
    getMermaid(config?: unknown) {
      if (config) {
        mermaidInstance.initialize(config);
      }
      return mermaidInstance;
    },
  };
}

export const mermaid = createMermaidPlugin();

export type { MermaidConfig } from "mermaid";
