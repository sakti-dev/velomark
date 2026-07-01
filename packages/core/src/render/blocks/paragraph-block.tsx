import type { Component } from "solid-js";
import type { ParagraphBlockData } from "../../lib/parser/block-boundaries";
import { useBlock } from "../../lib/block-context";
import { useVelomark } from "../../lib/velomark-context";
import { RenderInline } from "../inline/render-inline";

export const ParagraphBlock: Component = () => {
  const vm = useVelomark();
  const { block, index } = useBlock();
  const data = () => block.data as ParagraphBlockData;

  return (
    <p
      data-velomark-block-id={vm.debug ? block.id : undefined}
      data-velomark-block-index={index}
      data-velomark-block-kind={block.kind}
      data-velomark-incomplete={block.status === "streaming" ? "" : undefined}
    >
      <RenderInline text={data().text} />
    </p>
  );
};
