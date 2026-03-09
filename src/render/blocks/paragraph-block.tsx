import type { Component } from "solid-js";
import type { ParagraphBlockData } from "../../parser/block-boundaries";
import type { RenderBlock } from "../../types";
import { RenderInline } from "../inline/render-inline";

export const ParagraphBlock: Component<{
  block: RenderBlock<ParagraphBlockData>;
  index: number;
}> = (props) => {
  return (
    <p
      data-velomark-block-id={props.block.id}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
    >
      <RenderInline text={props.block.data.text} />
    </p>
  );
};
