import { type Component, createMemo, For, Show, useContext } from "solid-js";
import { cn } from "cnfast";
import type { TableBlockData } from "../../lib/parser/block-boundaries";
import { useBlock } from "../../lib/block-context";
import { BlockContext } from "../../lib/block-context";
import { useVelomark } from "../../lib/velomark-context";
import { parseInline } from "../../lib/parser/inline-parser";
import {
  computeAnimationMulti,
  resolveAnimationConfig,
  type AnimationConfig,
  type WordMeta,
} from "../../lib/animation/compute-animation";
import type { InlineToken } from "../../types";
import { RenderInlineTokens } from "../inline/inline-token-view";
import { TableCopyDropdown } from "./copy-dropdown";
import { TableDownloadDropdown } from "./download-dropdown";
import { TableFullscreenButton } from "./fullscreen-button";

const alignClass = (align: string | undefined) =>
  cn(align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left");

type AnimMetaAccessor = () => Map<string, WordMeta[]> | null;

/**
 * Renders a single table cell's inline content. Reads animation metadata
 * from the shared table-level animMeta (computed across ALL cells with one
 * charCounter), not from a per-cell RenderInline.
 */
const CellText: Component<{
  text: string;
  basePath: string;
  animMeta: AnimMetaAccessor;
  config: AnimationConfig | null;
}> = (props) => {
  const vm = useVelomark();
  const tokens = createMemo(() => parseInline(props.text, vm.definitions));
  return (
    <RenderInlineTokens
      tokens={tokens()}
      animMeta={props.animMeta}
      config={props.config ?? undefined}
      basePath={props.basePath}
    />
  );
};

export const Table: Component = () => {
  const vm = useVelomark();
  const blockAccessor = useContext(BlockContext);
  const { block, index } = useBlock();
  const data = () => block.data as TableBlockData;

  const header = () => data().rows[0] ?? [];
  const bodyRows = () => data().rows.slice(1);
  const align = (i: number) => data().align[i] ?? "left";

  const resolvedConfig = vm.animationConfig ? resolveAnimationConfig(vm.animationConfig) : null;

  // Shared across ALL cells — monotonically growing, never reset.
  // Mirrors streamdown's single visitParents pass over the entire table.
  let prevContentLength = 0;

  // Flatten all cells into token arrays with unique base paths.
  // Header cells: "h0.", "h1.", ... Body: "b0c0.", "b0c1.", "b1c0.", ...
  const cellInputs = createMemo(() => {
    const hdr = header();
    const body = bodyRows();
    const inputs: { tokens: InlineToken[]; basePath: string }[] = [];

    for (let c = 0; c < hdr.length; c += 1) {
      inputs.push({
        tokens: parseInline(hdr[c] ?? "", vm.definitions),
        basePath: `h${c}.`,
      });
    }
    for (let r = 0; r < body.length; r += 1) {
      const row = body[r] ?? [];
      for (let c = 0; c < row.length; c += 1) {
        inputs.push({
          tokens: parseInline(row[c] ?? "", vm.definitions),
          basePath: `b${r}c${c}.`,
        });
      }
    }
    return inputs;
  });

  // Single-pass animation computation with shared charCounter across ALL cells.
  const animMeta = createMemo(() => {
    const inputs = cellInputs();
    const isStreaming = blockAccessor?.()?.isStreaming ?? false;
    if (!resolvedConfig || !isStreaming) return null;

    const result = computeAnimationMulti(inputs, resolvedConfig, prevContentLength);
    prevContentLength = result.totalChars;
    return result.entries;
  });

  const headerKeys = createMemo(() => header().map((_, i) => String(i)));
  const bodyRowKeys = createMemo(() => bodyRows().map((_, i) => String(i)));

  const tableHeader = () => (
    <thead class={cn("bg-muted/80")}>
      <tr class={cn("border-border")}>
        <For each={headerKeys()}>
          {(_key, cellIndex) => (
            <th
              class={cn(
                "whitespace-nowrap px-4 py-2 font-semibold text-sm",
                alignClass(align(cellIndex())),
              )}
            >
              <CellText
                text={header()[cellIndex()] ?? ""}
                basePath={`h${cellIndex()}.`}
                animMeta={animMeta}
                config={resolvedConfig}
              />
            </th>
          )}
        </For>
      </tr>
    </thead>
  );

  const tableBody = () => (
    <tbody class={cn("divide-y divide-border")}>
      <For each={bodyRowKeys()}>
        {(_rowKey, rowIndex) => {
          const row = () => bodyRows()[rowIndex()] ?? [];
          const cellKeys = createMemo(() => row().map((_, i) => String(i)));
          return (
            <tr class={cn("border-border")}>
              <For each={cellKeys()}>
                {(_cellKey, cellIndex) => (
                  <td class={cn("px-4 py-2 text-sm", alignClass(align(cellIndex())))}>
                    <CellText
                      text={row()[cellIndex()] ?? ""}
                      basePath={`b${rowIndex()}c${cellIndex()}.`}
                      animMeta={animMeta}
                      config={resolvedConfig}
                    />
                  </td>
                )}
              </For>
            </tr>
          );
        }}
      </For>
    </tbody>
  );

  return (
    <div
      class={cn("vm-table my-4 flex flex-col gap-2 rounded-lg border border-border bg-sidebar p-2")}
      data-velomark="table-wrapper"
    >
      <div class={cn("flex justify-end gap-1")} data-velomark="table-actions">
        <Show when={vm.controls?.table?.copy ?? true}>
          <TableCopyDropdown />
        </Show>
        <Show when={vm.controls?.table?.download ?? true}>
          <TableDownloadDropdown />
        </Show>
        <Show when={vm.controls?.table?.fullscreen ?? true}>
          <TableFullscreenButton>
            {tableHeader()}
            {tableBody()}
          </TableFullscreenButton>
        </Show>
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
