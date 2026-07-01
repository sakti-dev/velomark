import type { Component } from "solid-js";
import { Dynamic } from "solid-js/web";

import { usePlugins } from "../../lib/plugin-context";
import type { CodeBlockData } from "../../lib/parser/block-boundaries";
import type {
  RenderBlock,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
} from "../../types";
import { CodeBlock, resolveCodeBlockOptions } from "../code-block";
import { MermaidPluginView } from "../mermaid";

export const CodeBlockView: Component<{
  block: RenderBlock<CodeBlockData>;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  debug?: boolean;
  index: number;
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
    <CodeBlock
      code={props.block.data.code}
      copyButton={options().copyButton}
      data-velomark-block-id={props.debug ? props.block.id : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
      data-velomark-incomplete={props.block.status === "streaming" ? "" : undefined}
      highlight={options().highlight}
      language={language()}
      languageLabel={options().languageLabel}
      codePlugin={codePlugin() ?? undefined}
      isIncomplete={props.block.status === "streaming"}
    />
  );
};
