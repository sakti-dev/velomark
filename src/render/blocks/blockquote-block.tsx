import { For, type Component } from "solid-js";
import type { BlockquoteBlockData } from "../../parser/block-boundaries";
import type { RenderBlock } from "../../types";
import { RenderInline } from "../inline/render-inline";

export const BlockquoteBlock: Component<{
  block: RenderBlock<BlockquoteBlockData>;
  debug?: boolean;
  index: number;
}> = (props) => {
  return (
    <blockquote
      data-velomark-block-id={props.debug ? props.block.id : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
    >
      <For each={props.block.data.paragraphs}>
        {(paragraph) => (
          <p>
            <RenderInline text={paragraph} />
          </p>
        )}
      </For>
    </blockquote>
  );
};
