import { type Component, For } from "solid-js";
import { cn } from "cnfast";
import type { TableBlockData } from "../../lib/parser/block-boundaries";
import type {
  ReferenceDefinitionMap,
  RenderBlock,
  VelomarkContainerRendererProps,
} from "../../types";
import { RenderInline } from "../inline/render-inline";

export interface TableProps {
  block: RenderBlock<TableBlockData>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  definitions?: ReferenceDefinitionMap;
  index: number;
}

const alignClass = (align: string | undefined) =>
  cn(align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left");

export const Table: Component<TableProps> = (props) => {
  const header = () => props.block.data.rows[0] ?? [];
  const bodyRows = () => props.block.data.rows.slice(1);
  const align = (index: number) => props.block.data.align[index] ?? "left";

  return (
    <div
      class={cn("vm-table my-4 flex flex-col gap-2 rounded-lg border border-border bg-sidebar p-2")}
      data-velomark="table-wrapper"
    >
      <div
        class={cn(
          "border-collapse overflow-x-auto overflow-y-auto rounded-md border border-border bg-background",
        )}
      >
        <table
          class={cn("w-full divide-y divide-border")}
          data-velomark-block-id={props.debug ? props.block.id : undefined}
          data-velomark-block-index={props.index}
          data-velomark-block-kind={props.block.kind}
          data-velomark-incomplete={props.block.status === "streaming" ? "" : undefined}
        >
          <thead class={cn("bg-muted/80")}>
            <tr class={cn("border-border")}>
              <For each={header()}>
                {(cell, index) => (
                  <th
                    class={cn(
                      "whitespace-nowrap px-4 py-2 font-semibold text-sm",
                      alignClass(align(index())),
                    )}
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
                      <td class={cn("px-4 py-2 text-sm", alignClass(align(index())))}>
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
    </div>
  );
};
