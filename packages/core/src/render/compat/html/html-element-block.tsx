import type { Component } from "solid-js";
import type { HtmlElementBlockData } from "../../../lib/parser/block-boundaries";
import { useBlock } from "../../../lib/block-context";
import { useVelomark } from "../../../lib/velomark-context";
import { HtmlElementView } from "./html-element-view";

export const HtmlElementBlock: Component = () => {
  const vm = useVelomark();
  const { block, index } = useBlock();
  const data = () => block.data as HtmlElementBlockData;

  return (
    <div
      data-velomark-block-id={vm.debug ? block.id : undefined}
      data-velomark-block-index={index}
      data-velomark-block-kind={block.kind}
      data-velomark-incomplete={block.status === "streaming" ? "" : undefined}
    >
      <HtmlElementView
        attributes={data().attributes}
        children={data().children}
        tagName={data().tagName}
      />
    </div>
  );
};
