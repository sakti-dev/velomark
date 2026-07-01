import type { Component } from "solid-js";
import { cn } from "cnfast";
import type { HtmlBlockData } from "../../../lib/parser/block-boundaries";
import type { RenderBlock } from "../../../types";

export const HtmlBlock: Component<{
  block: RenderBlock<HtmlBlockData>;
  debug?: boolean;
  index: number;
}> = (props) => {
  return (
    <div
      data-velomark-block-id={props.debug ? props.block.id : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
      data-velomark-incomplete={props.block.status === "streaming" ? "" : undefined}
    >
      <pre class={cn("overflow-x-auto rounded-md border border-border bg-background p-4 text-sm")}>
        <code>{props.block.data.value}</code>
      </pre>
    </div>
  );
};
