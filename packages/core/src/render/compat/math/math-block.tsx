import type { Component } from "solid-js";
import { cn } from "cnfast";

import type { MathBlockData } from "../../../lib/parser/block-boundaries";
import { useBlock } from "../../../lib/block-context";
import { useVelomark } from "../../../lib/velomark-context";
import { MathView } from "./math-view";

export const MathBlock: Component = () => {
  const vm = useVelomark();
  const { block, index } = useBlock();
  const data = () => block.data as MathBlockData;

  return (
    <div
      class={cn("my-4 rounded-md border border-border bg-background p-4")}
      data-velomark-block-id={vm.debug ? block.id : undefined}
      data-velomark-block-index={index}
      data-velomark-block-kind={block.kind}
      data-velomark-incomplete={block.status === "streaming" ? "" : undefined}
    >
      <MathView displayMode={true} formula={data().value} />
    </div>
  );
};
