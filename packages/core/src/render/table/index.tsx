import { type Component, For } from "solid-js";
import { cn } from "cnfast";
import type { TableBlockData } from "../../lib/parser/block-boundaries";
import { useBlock } from "../../lib/block-context";
import { useVelomark } from "../../lib/velomark-context";
import { RenderInline } from "../inline/render-inline";
import { TableCopyDropdown } from "./copy-dropdown";
import { TableDownloadDropdown } from "./download-dropdown";
import { TableFullscreenButton } from "./fullscreen-button";

const alignClass = (align: string | undefined) =>
  cn(align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left");

export const Table: Component = () => {
  const vm = useVelomark();
  const { block, index } = useBlock();
  const data = () => block.data as TableBlockData;

  const header = () => data().rows[0] ?? [];
  const bodyRows = () => data().rows.slice(1);
  const align = (index: number) => data().align[index] ?? "left";

  const tableHeader = () => (
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
              <RenderInline text={cell} />
            </th>
          )}
        </For>
      </tr>
    </thead>
  );

  const tableBody = () => (
    <tbody class={cn("divide-y divide-border")}>
      <For each={bodyRows()}>
        {(row) => (
          <tr class={cn("border-border")}>
            <For each={row}>
              {(cell, index) => (
                <td class={cn("px-4 py-2 text-sm", alignClass(align(index())))}>
                  <RenderInline text={cell} />
                </td>
              )}
            </For>
          </tr>
        )}
      </For>
    </tbody>
  );

  return (
    <div
      class={cn("vm-table my-4 flex flex-col gap-2 rounded-lg border border-border bg-sidebar p-2")}
      data-velomark="table-wrapper"
    >
      <div class={cn("flex justify-end gap-1")} data-velomark="table-actions">
        <TableCopyDropdown />
        <TableDownloadDropdown />
        <TableFullscreenButton>
          {tableHeader()}
          {tableBody()}
        </TableFullscreenButton>
      </div>
      <div
        class={cn(
          "border-collapse overflow-x-auto overflow-y-auto rounded-md border border-border bg-background",
        )}
      >
        <table
          class={cn("w-full divide-y divide-border")}
          data-velomark-block-id={vm.debug ? block.id : undefined}
          data-velomark-block-index={index}
          data-velomark-block-kind={block.kind}
          data-velomark-incomplete={block.status === "streaming" ? "" : undefined}
        >
          {tableHeader()}
          {tableBody()}
        </table>
      </div>
    </div>
  );
};
