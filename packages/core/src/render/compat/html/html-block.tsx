import type { Component } from "solid-js";
import { cn } from "cnfast";
import type { HtmlBlockData } from "../../../lib/parser/block-boundaries";
import { useBlock } from "../../../lib/block-context";
import { useVelomark } from "../../../lib/velomark-context";

export const HtmlBlock: Component = () => {
  const vm = useVelomark();
  const { block, index } = useBlock();
  const data = () => block.data as HtmlBlockData;

  return (
    <div
      data-velomark-block-id={vm.debug ? block.id : undefined}
      data-velomark-block-index={index}
      data-velomark-block-kind={block.kind}
      data-velomark-incomplete={block.status === "streaming" ? "" : undefined}
    >
      <pre class={cn("overflow-x-auto rounded-md border border-border bg-background p-4 text-sm")}>
        <code>{data().value}</code>
      </pre>
    </div>
  );
};
