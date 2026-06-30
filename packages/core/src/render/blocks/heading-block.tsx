import type { Component } from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "cnfast";

import type { HeadingBlockData } from "../../parser/block-boundaries";
import type {
  ReferenceDefinitionMap,
  RenderBlock,
  VelomarkContainerRendererProps,
} from "../../types";
import { RenderInline } from "../inline/render-inline";

const HEADING_CLASS: Record<number, string> = {
  1: "mt-6 mb-2 font-semibold text-3xl",
  2: "mt-6 mb-2 font-semibold text-2xl",
  3: "mt-6 mb-2 font-semibold text-xl",
  4: "mt-6 mb-2 font-semibold text-lg",
  5: "mt-6 mb-2 font-semibold text-base",
  6: "mt-6 mb-2 font-semibold text-sm",
};

export const HeadingBlock: Component<{
  block: RenderBlock<HeadingBlockData>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  definitions?: ReferenceDefinitionMap;
  index: number;
}> = (props) => {
  const depth = () => Math.min(Math.max(props.block.data.depth, 1), 6);

  return (
    <Dynamic
      class={cn(HEADING_CLASS[depth()])}
      component={`h${depth()}`}
      data-velomark-block-id={props.debug ? props.block.id : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
      data-velomark-heading-depth={depth()}
    >
      <RenderInline
        containers={props.containers}
        definitions={props.definitions}
        text={props.block.data.text}
      />
    </Dynamic>
  );
};
