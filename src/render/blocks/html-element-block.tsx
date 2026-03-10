import type { Component } from "solid-js";
import type { HtmlElementBlockData } from "../../parser/block-boundaries";
import type { RenderBlock } from "../../types";
import { HtmlElementView } from "../html-element-view";

export const HtmlElementBlock: Component<{
  block: RenderBlock<HtmlElementBlockData>;
  debug?: boolean;
  index: number;
}> = (props) => {
  return (
    <div
      data-velomark-block-id={props.debug ? props.block.id : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
    >
      <HtmlElementView
        attributes={props.block.data.attributes}
        children={props.block.data.children}
        tagName={props.block.data.tagName}
      />
    </div>
  );
};
