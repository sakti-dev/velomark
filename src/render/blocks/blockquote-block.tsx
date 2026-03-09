import { For, type Component } from "solid-js";
import type { BlockquoteBlockData } from "../../parser/block-boundaries";
import type { RenderBlock } from "../../types";
import { RenderInline } from "../inline/render-inline";

export const BlockquoteBlock: Component<{
  block: RenderBlock<BlockquoteBlockData>;
  index: number;
}> = (props) => {
  const lines = () => props.block.data.text.split("\n");

  return (
    <blockquote
      data-velomark-block-id={props.block.id}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
    >
      <For each={lines()}>
        {(line, index) => (
          <>
            {index() > 0 && <br />}
            <RenderInline text={line} />
          </>
        )}
      </For>
    </blockquote>
  );
};
