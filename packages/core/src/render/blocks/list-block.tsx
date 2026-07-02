import { type Component, createMemo, For } from "solid-js";
import { cn } from "cnfast";
import type { ListBlockData } from "../../lib/parser/block-boundaries";
import { useBlock } from "../../lib/block-context";
import { BlockProvider } from "../../lib/block-context";
import { useVelomark } from "../../lib/velomark-context";
import { RenderBlockView } from "../render-block";
import { RenderInline } from "../inline/render-inline";

type ListItem = ListBlockData["items"][number];

export const ListBlock: Component = () => {
  const vm = useVelomark();
  const { block, index } = useBlock();
  const data = () => block.data as ListBlockData;

  const commonProps = {
    "data-velomark-block-id": vm.debug ? block.id : undefined,
    "data-velomark-block-index": index,
    "data-velomark-block-kind": block.kind,
    "data-velomark-incomplete": block.status === "streaming" ? "" : undefined,
  } as const;

  // String keys — primitives compared by value, so <For> preserves <li>
  // elements across re-renders even when the underlying item objects are
  // recreated by the store reconcile. Without this, every list item remounts
  // on each stream chunk, resetting animation state.
  const itemKeys = createMemo(() => data().items.map((_, i) => String(i)));
  const item = (i: number): ListItem => data().items[i]!;

  const renderItemContent = (itemIndex: number) => {
    const checked = () => item(itemIndex).checked;
    return (
      <>
        {checked() === undefined ? (
          <RenderInline text={item(itemIndex).text} />
        ) : (
          <label>
            <input checked={checked() ?? false} disabled type="checkbox" />
            <span>
              <RenderInline text={item(itemIndex).text} />
            </span>
          </label>
        )}
        <For each={item(itemIndex).children ?? []}>
          {(child, childIndex) => (
            <BlockProvider
              block={{
                id: `${block.id}:${child.kind}:${item(itemIndex).text}`,
                kind: child.kind,
                sourceStart: block.sourceStart,
                sourceEnd: block.sourceEnd,
                status: block.status,
                fingerprint: `${block.fingerprint}:${child.kind}:${item(itemIndex).text}`,
                data: child.data as never,
              }}
              blockId={`${block.id}:${child.kind}:${item(itemIndex).text}`}
              index={childIndex()}
            >
              <RenderBlockView />
            </BlockProvider>
          )}
        </For>
      </>
    );
  };

  if (data().ordered) {
    return (
      <ol {...commonProps} class={cn("list-inside list-decimal whitespace-normal [li_&]:pl-6")}>
        <For each={itemKeys()}>
          {(_key, itemIndex) => (
            <li class={cn("py-1 [&>p]:inline")} dir={vm.dir}>
              {renderItemContent(itemIndex())}
            </li>
          )}
        </For>
      </ol>
    );
  }

  return (
    <ul {...commonProps} class={cn("list-inside list-disc whitespace-normal [li_&]:pl-6")}>
      <For each={itemKeys()}>
        {(_key, itemIndex) => (
          <li class={cn("py-1 [&>p]:inline")} dir={vm.dir}>
            {renderItemContent(itemIndex())}
          </li>
        )}
      </For>
    </ul>
  );
};
