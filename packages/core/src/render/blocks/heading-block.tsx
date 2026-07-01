import type { Component } from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "cnfast";
import type { HeadingBlockData } from "../../lib/parser/block-boundaries";
import { useBlock } from "../../lib/block-context";
import { useVelomark } from "../../lib/velomark-context";
import { RenderInline } from "../inline/render-inline";

const HEADING_CLASS: Record<number, string> = {
  1: "mt-6 mb-2 font-semibold text-3xl",
  2: "mt-6 mb-2 font-semibold text-2xl",
  3: "mt-6 mb-2 font-semibold text-xl",
  4: "mt-6 mb-2 font-semibold text-lg",
  5: "mt-6 mb-2 font-semibold text-base",
  6: "mt-6 mb-2 font-semibold text-sm",
};

export const HeadingBlock: Component = () => {
  const vm = useVelomark();
  const { block, index } = useBlock();
  const data = () => block.data as HeadingBlockData;
  const depth = () => Math.min(Math.max(data().depth, 1), 6);

  return (
    <Dynamic
      class={cn(HEADING_CLASS[depth()])}
      component={`h${depth()}`}
      data-velomark-block-id={vm.debug ? block.id : undefined}
      data-velomark-block-index={index}
      data-velomark-block-kind={block.kind}
      data-velomark-incomplete={block.status === "streaming" ? "" : undefined}
    >
      <RenderInline text={data().text} />
    </Dynamic>
  );
};
