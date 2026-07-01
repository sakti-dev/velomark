import type { Component } from "solid-js";
import { cn } from "cnfast";
import { useBlock } from "../../lib/block-context";
import { useVelomark } from "../../lib/velomark-context";

export const ThematicBreakBlock: Component = () => {
  const vm = useVelomark();
  const { block, index } = useBlock();

  return (
    <hr
      class={cn("my-6 border-border")}
      data-velomark-block-id={vm.debug ? block.id : undefined}
      data-velomark-block-index={index}
      data-velomark-block-kind="thematic-break"
    />
  );
};
