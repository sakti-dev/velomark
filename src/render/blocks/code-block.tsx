import { Dynamic } from "solid-js/web";
import type { Component } from "solid-js";
import type { CodeBlockData } from "../../parser/block-boundaries";
import type {
  RenderBlock,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
} from "../../types";
import {
  CodeBlockHeader,
  resolveCodeBlockOptions,
} from "../code-blocks/default-code-block-shell";
import { HighlightedCodeBlock } from "../code-blocks/highlighted-code-block";
import { MermaidBlock } from "./mermaid-block";

export const CodeBlock: Component<{
  block: RenderBlock<CodeBlockData>;
  codeBlockRenderers?: Record<
    string,
    Component<VelomarkCodeBlockRendererProps>
  >;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  debug?: boolean;
  index: number;
}> = (props) => {
  const language = () => props.block.data.language?.trim() || undefined;
  const customRenderer = () =>
    language() ? props.codeBlockRenderers?.[language() ?? ""] : undefined;
  const resolvedCustomRenderer = customRenderer();

  if (resolvedCustomRenderer) {
    return (
      <Dynamic
        component={resolvedCustomRenderer}
        code={props.block.data.code}
        language={language()}
      />
    );
  }

  if (language() === "mermaid") {
    return (
      <MermaidBlock
        block={props.block}
        debug={props.debug}
        index={props.index}
      />
    );
  }

  const options = () => resolveCodeBlockOptions(props.codeBlockOptions);

  return (
    <div
      data-velomark-block-id={props.debug ? props.block.id : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
      data-velomark-language={language() ?? ""}
    >
      <CodeBlockHeader
        code={props.block.data.code}
        language={language()}
        options={props.codeBlockOptions}
      />
      {options().highlight ? (
        <HighlightedCodeBlock
          code={props.block.data.code}
          language={language()}
          theme={options().highlightTheme}
        />
      ) : (
        <pre>
          <code>{props.block.data.code}</code>
        </pre>
      )}
    </div>
  );
};
