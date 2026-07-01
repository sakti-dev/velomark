import type { Component } from "solid-js";
import { cn } from "cnfast";

export const ThematicBreakBlock: Component<{
  blockId: string;
  debug?: boolean;
  index: number;
}> = (props) => {
  return (
    <hr
      class={cn("my-6 border-border")}
      data-velomark-block-id={props.debug ? props.blockId : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind="thematic-break"
    />
  );
};
