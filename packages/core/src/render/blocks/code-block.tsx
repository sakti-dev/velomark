import type { Component } from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "cnfast";

import { usePlugins } from "../../plugins/plugin-context";
import type { CodeBlockData } from "../../parser/block-boundaries";
import type { VelomarkTheme } from "../../theme/types";
import type {
  RenderBlock,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
} from "../../types";
import { HighlightedCodeBlock } from "../code/highlighted-code-block";
import { MermaidPluginView } from "../code/mermaid-plugin-view";
import { CodeBlockOverlayControls, resolveCodeBlockOptions } from "../code/shell";

export const CodeBlock: Component<{
  block: RenderBlock<CodeBlockData>;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  debug?: boolean;
  index: number;
  theme: VelomarkTheme;
}> = (props) => {
  const plugins = usePlugins();
  const language = () => props.block.data.language?.trim() || undefined;
  const customRenderer = () =>
    language() ? props.codeBlockRenderers?.[language() ?? ""] : undefined;
  const resolvedCustomRenderer = customRenderer();

  if (resolvedCustomRenderer) {
    return (
      <Dynamic
        code={props.block.data.code}
        component={resolvedCustomRenderer}
        language={language()}
      />
    );
  }

  const mermaidPlugin = () => plugins.mermaid;

  if (language() === "mermaid" && mermaidPlugin()) {
    return (
      <MermaidPluginView
        block={props.block}
        debug={props.debug}
        index={props.index}
        plugin={mermaidPlugin() as NonNullable<ReturnType<typeof mermaidPlugin>>}
      />
    );
  }

  const options = () => resolveCodeBlockOptions(props.codeBlockOptions);
  const codePlugin = () => plugins.code;

  return (
    <div
      class={cn("relative my-4 w-full rounded-xl border border-border bg-sidebar p-2 text-sm")}
      data-velomark-block-id={props.debug ? props.block.id : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
      data-velomark-language={language() ?? ""}
    >
      <CodeBlockOverlayControls
        code={props.block.data.code}
        language={language()}
        options={props.codeBlockOptions}
      />
      {options().highlight && codePlugin() ? (
        <HighlightedCodeBlock
          code={props.block.data.code}
          language={language()}
          plugin={codePlugin() as NonNullable<ReturnType<typeof codePlugin>>}
        />
      ) : (
        <pre>
          <code>{props.block.data.code}</code>
        </pre>
      )}
    </div>
  );
};
