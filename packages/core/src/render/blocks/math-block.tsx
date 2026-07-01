import type { Component } from "solid-js";
import { cn } from "cnfast";

import type { MathBlockData } from "../../lib/parser/block-boundaries";
import type { RenderBlock } from "../../types";
import { MathView } from "../math/math-view";

export const MathBlock: Component<{
  block: RenderBlock<MathBlockData>;
  debug?: boolean;
  index: number;
}> = (props) => {
  return (
    <div
      class={cn("my-4 rounded-md border border-border bg-background p-4")}
      data-velomark-block-id={props.debug ? props.block.id : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
      data-velomark-incomplete={props.block.status === "streaming" ? "" : undefined}
    >
      <MathView displayMode={true} formula={props.block.data.value} />
    </div>
  );
};
