import { type Component, For } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { ContainerBlockData } from "../../lib/parser/block-boundaries";
import { useBlock } from "../../lib/block-context";
import { BlockProvider } from "../../lib/block-context";
import { useVelomark } from "../../lib/velomark-context";
import { directiveAttributeProps } from "../compat/directives/directive-attribute-props";
import { RenderBlockView } from "../render-block";

export const ContainerBlock: Component = () => {
  const vm = useVelomark();
  const { block, index } = useBlock();
  const data = () => block.data as ContainerBlockData;

  const customContainer = () => vm.containers?.[data().name];
  const resolvedCustomContainer = customContainer();

  const renderedChildren = (
    <For each={data().children}>
      {(child, childIndex) => (
        <BlockProvider
          block={
            {
              ...child,
              id: `${block.id}:container:${childIndex()}`,
            } as never
          }
          blockId={`${block.id}:container:${childIndex()}`}
          index={childIndex()}
        >
          <RenderBlockView />
        </BlockProvider>
      )}
    </For>
  );

  if (resolvedCustomContainer) {
    return (
      <Dynamic
        attributes={data().attributes}
        component={resolvedCustomContainer}
        name={data().name}
      >
        {renderedChildren}
      </Dynamic>
    );
  }

  return (
    <div
      data-velomark-block-id={vm.debug ? block.id : undefined}
      data-velomark-block-index={index}
      data-velomark-block-kind={block.kind}
      data-velomark-incomplete={block.status === "streaming" ? "" : undefined}
      data-velomark-container={data().directiveType === "container" ? data().name : undefined}
      data-velomark-leaf-directive={data().directiveType === "leaf" ? data().name : undefined}
      {...directiveAttributeProps(data().attributes)}
    >
      {renderedChildren}
    </div>
  );
};
