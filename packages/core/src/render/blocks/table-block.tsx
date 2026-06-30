import { type Component, For } from "solid-js";
import { cn } from "cnfast";
import type { TableBlockData } from "../../parser/block-boundaries";
import type {
  ReferenceDefinitionMap,
  RenderBlock,
  VelomarkContainerRendererProps,
} from "../../types";
import { RenderInline } from "../inline/render-inline";

export const TableBlock: Component<{
  block: RenderBlock<TableBlockData>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  definitions?: ReferenceDefinitionMap;
  index: number;
}> = (props) => {
  const header = () => props.block.data.rows[0] ?? [];
  const bodyRows = () => props.block.data.rows.slice(1);
  const align = (index: number) => props.block.data.align[index] ?? "left";
  const alignClass = (index: number) =>
    cn(
      align(index) === "center"
        ? "text-center"
        : align(index) === "right"
          ? "text-right"
          : "text-left",
    );

  return (
    <div class={cn("vm-table my-4 w-full overflow-x-auto rounded-md border border-border")}>
      <table
        data-velomark-block-id={props.debug ? props.block.id : undefined}
        data-velomark-block-index={props.index}
        data-velomark-block-kind={props.block.kind}
      >
        <thead class={cn("bg-muted/80")}>
          <tr class={cn("border-border")}>
            <For each={header()}>
              {(cell, index) => (
                <th
                  class={cn(
                    "whitespace-nowrap px-4 py-2 font-semibold text-sm",
                    alignClass(index()),
                  )}
                  data-velomark-align={align(index())}
                >
                  <RenderInline
                    containers={props.containers}
                    definitions={props.definitions}
                    text={cell}
                  />
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody class={cn("divide-y divide-border")}>
          <For each={bodyRows()}>
            {(row) => (
              <tr class={cn("border-border")}>
                <For each={row}>
                  {(cell, index) => (
                    <td
                      class={cn("px-4 py-2 text-sm", alignClass(index()))}
                      data-velomark-align={align(index())}
                    >
                      <RenderInline
                        containers={props.containers}
                        definitions={props.definitions}
                        text={cell}
                      />
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
};
