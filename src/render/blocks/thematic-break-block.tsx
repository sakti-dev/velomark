import type { Component } from "solid-js";

export const ThematicBreakBlock: Component<{
  blockId: string;
  index: number;
}> = (props) => {
  return (
    <hr
      data-velomark-block-id={props.blockId}
      data-velomark-block-index={props.index}
      data-velomark-block-kind="thematic-break"
    />
  );
};
