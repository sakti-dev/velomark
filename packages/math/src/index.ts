import katex from "katex";

export type { KatexOptions } from "katex";

export interface MathRenderResult {
  html: string;
}

export interface MathRendererPlugin {
  getStyles?: () => string;
  name: "katex";
  render: (tex: string, displayMode: boolean) => MathRenderResult | null;
  type: "math";
}

export interface MathPluginOptions {
  errorColor?: string;
  macros?: Record<string, string>;
  output?: "html" | "mathml" | "htmlAndMathml";
  strict?: boolean | "error" | "warn" | "ignore";
  throwOnError?: boolean;
  trust?: boolean;
}

export function createMathPlugin(options: MathPluginOptions = {}): MathRendererPlugin {
  const renderOptions: katex.KatexOptions = {
    throwOnError: options.throwOnError ?? false,
    errorColor: options.errorColor ?? "var(--color-muted-foreground)",
    ...(options.output !== undefined && { output: options.output }),
    ...(options.strict !== undefined && { strict: options.strict }),
    ...(options.trust !== undefined && { trust: options.trust }),
    ...(options.macros !== undefined && { macros: options.macros }),
  };

  return {
    name: "katex",
    type: "math",

    render(tex: string, displayMode: boolean): MathRenderResult | null {
      try {
        const html = katex.renderToString(tex, {
          ...renderOptions,
          displayMode,
        });
        return { html };
      } catch {
        return null;
      }
    },

    getStyles() {
      return "katex/dist/katex.min.css";
    },
  };
}

export const math = createMathPlugin();
