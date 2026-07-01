import { type Component, For } from "solid-js";
import { cn } from "cnfast";
import type { BlockquoteBlockData } from "../../lib/parser/block-boundaries";
import { useBlock } from "../../lib/block-context";
import { useVelomark } from "../../lib/velomark-context";
import { RenderInline } from "../inline/render-inline";

export const BlockquoteBlock: Component = () => {
  const vm = useVelomark();
  const { block, index } = useBlock();
  const data = () => block.data as BlockquoteBlockData;

  return (
    <blockquote
      class={cn("my-4 border-l-4 border-muted-foreground/30 pl-4 text-muted-foreground italic")}
      data-velomark-block-id={vm.debug ? block.id : undefined}
      data-velomark-block-index={index}
      data-velomark-block-kind={block.kind}
      data-velomark-incomplete={block.status === "streaming" ? "" : undefined}
    >
      <For each={data().paragraphs}>
        {(paragraph) => (
          <p>
            <RenderInline text={paragraph} />
          </p>
        )}
      </For>
    </blockquote>
  );
};
