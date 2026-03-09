import type { Component } from "solid-js";
import type { CodeBlockData } from "../../parser/block-boundaries";
import type { RenderBlock } from "../../types";

export const CodeBlock: Component<{
  block: RenderBlock<CodeBlockData>;
  index: number;
}> = (props) => {
  return (
    <pre
      data-velomark-block-id={props.block.id}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
      data-velomark-language={props.block.data.language ?? ""}
    >
      <code>{props.block.data.code}</code>
    </pre>
  );
};
