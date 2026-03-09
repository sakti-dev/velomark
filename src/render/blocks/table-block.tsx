import { For, type Component } from "solid-js";
import type { TableBlockData } from "../../parser/block-boundaries";
import type { RenderBlock } from "../../types";
import { RenderInline } from "../inline/render-inline";

export const TableBlock: Component<{
  block: RenderBlock<TableBlockData>;
  debug?: boolean;
  index: number;
}> = (props) => {
  const header = () => props.block.data.rows[0] ?? [];
  const bodyRows = () => props.block.data.rows.slice(1);
  const align = (index: number) => props.block.data.align[index] ?? "left";

  return (
    <div data-velomark-table-wrapper="">
      <table
        data-velomark-block-id={props.debug ? props.block.id : undefined}
        data-velomark-block-index={props.index}
        data-velomark-block-kind={props.block.kind}
      >
        <thead>
          <tr>
            <For each={header()}>
              {(cell, index) => (
                <th data-velomark-align={align(index())}>
                  <RenderInline text={cell} />
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={bodyRows()}>
            {(row) => (
              <tr>
                <For each={row}>
                  {(cell, index) => (
                    <td data-velomark-align={align(index())}>
                      <RenderInline text={cell} />
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
