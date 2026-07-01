import { type Component, For, Show } from "solid-js";
import { cn } from "cnfast";
import { useVelomark } from "../../../lib/velomark-context";
import { BlockProvider } from "../../../lib/block-context";
import { RenderBlockView } from "../../render-block";

export const FootnotesSection: Component = () => {
  const vm = useVelomark();

  const orderedFootnotes = () =>
    vm.footnoteReferenceOrder
      .map((identifier) => ({
        blocks: vm.footnoteDefinitions[identifier],
        identifier,
      }))
      .filter((entry) => entry.blocks !== undefined);

  return (
    <Show when={orderedFootnotes().length > 0}>
      <section class={cn("vm-footnotes mt-6 border-t border-border pt-4 text-sm")}>
        <hr class={cn("sr-only")} />
        <ol>
          <For each={orderedFootnotes()}>
            {(entry) => (
              <li id={`fn-${entry.identifier}`}>
                <div>
                  <For each={entry.blocks}>
                    {(block, index) => (
                      <BlockProvider block={block} blockId={block.id} index={index()}>
                        <RenderBlockView />
                      </BlockProvider>
                    )}
                  </For>
                </div>
                <a href={`#fnref-${entry.identifier}`}>↩</a>
              </li>
            )}
          </For>
        </ol>
      </section>
    </Show>
  );
};
