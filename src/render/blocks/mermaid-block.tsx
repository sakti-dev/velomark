import type { Component } from "solid-js";
import type { CodeBlockData } from "../../parser/block-boundaries";
import type { RenderBlock } from "../../types";

export const MermaidBlock: Component<{
  block: RenderBlock<CodeBlockData>;
  debug?: boolean;
  index: number;
}> = (props) => {
  return (
    <div
      data-velomark-block-id={props.debug ? props.block.id : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
      data-velomark-language="mermaid"
      data-velomark-mermaid=""
    >
      <div data-velomark-code-language="">mermaid</div>
      <pre>
        <code>{props.block.data.code}</code>
      </pre>
    </div>
  );
};
