import { For, type Component } from "solid-js";
import type { ListBlockData } from "../../parser/block-boundaries";
import type { RenderBlock } from "../../types";
import { RenderInline } from "../inline/render-inline";

export const ListBlock: Component<{
  block: RenderBlock<ListBlockData>;
  debug?: boolean;
  index: number;
}> = (props) => {
  const commonProps = {
    "data-velomark-block-id": props.debug ? props.block.id : undefined,
    "data-velomark-block-index": props.index,
    "data-velomark-block-kind": props.block.kind,
    "data-velomark-list-ordered": String(props.block.data.ordered),
  } as const;

  const items = () => props.block.data.items;

  if (props.block.data.ordered) {
    return (
      <ol {...commonProps}>
        <For each={items()}>
          {(item) => (
            <li>
              <RenderInline text={item} />
            </li>
          )}
        </For>
      </ol>
    );
  }

  return (
    <ul {...commonProps}>
      <For each={items()}>
        {(item) => (
          <li>
            <RenderInline text={item} />
          </li>
        )}
      </For>
    </ul>
  );
};
