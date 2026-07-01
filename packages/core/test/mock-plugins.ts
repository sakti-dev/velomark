import type {
  CodeHighlighterPlugin,
  DiagramPlugin,
  MathRendererPlugin,
} from "../src/lib/plugin-types";

/**
 * Mock plugin implementations for unit tests. Exercise core's rendering paths
 * (token spans, math innerHTML, mermaid SVG) without pulling in shiki/katex/mermaid.
 */
export const mockCodePlugin: CodeHighlighterPlugin = {
  getSupportedLanguages: () => ["ts", "text"],
  getThemes: () => ["github-dark", "github-light"],
  highlight: (opts) => ({
    tokens: opts.code.split("\n").map((line) =>
      line
        .split(/(\s+|[;,.={}()])/)
        .filter(Boolean)
        .map((content) => ({ color: "#aab", content })),
    ),
  }),
  name: "shiki",
  supportsLanguage: () => true,
  type: "code-highlighter",
};

export const mockMathPlugin: MathRendererPlugin = {
  name: "katex",
  render: (tex, displayMode) => {
    let depth = 0;
    for (const ch of tex) {
      if (ch === "{") {
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
      }

      if (depth < 0) {
        return null;
      }
    }

    return depth !== 0
      ? null
      : {
          html: `<span class="${displayMode ? "katex-display" : "katex"}">mock</span>`,
        };
  },
  type: "math",
};

export const mockMermaidPlugin: DiagramPlugin = {
  getMermaid: () => ({
    initialize: () => {},
    render: async () => ({
      svg: '<svg viewBox="0 0 10 10"><rect height="10" width="10" /></svg>',
    }),
  }),
  language: "mermaid",
  name: "mermaid",
  type: "diagram",
};

export const mockMermaidFailPlugin: DiagramPlugin = {
  getMermaid: () => ({
    initialize: () => {},
    render: async () => Promise.reject(new Error("mock render failure")),
  }),
  language: "mermaid",
  name: "mermaid",
  type: "diagram",
};
