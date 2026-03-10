import { Dynamic } from "solid-js/web";
import type { Component } from "solid-js";
import type { CodeBlockData } from "../../parser/block-boundaries";
import type {
  RenderBlock,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
} from "../../types";
import { DefaultCodeBlockShell } from "../code-blocks/default-code-block-shell";
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
        codeBlockOptions={props.codeBlockOptions}
        debug={props.debug}
        index={props.index}
      />
    );
  }

  return (
    <div
      data-velomark-block-id={props.debug ? props.block.id : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
      data-velomark-language={language() ?? ""}
    >
      <DefaultCodeBlockShell
        code={props.block.data.code}
        language={language()}
        options={props.codeBlockOptions}
        source={
          <pre>
            <code>{props.block.data.code}</code>
          </pre>
        }
      />
    </div>
  );
};
