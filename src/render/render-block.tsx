import type { Component } from "solid-js";
import type {
  BlockquoteBlockData,
  CodeBlockData,
  HeadingBlockData,
  ListBlockData,
  ParagraphBlockData,
  ParsedBlockData,
  TableBlockData,
} from "../parser/block-boundaries";
import type { RenderBlock } from "../types";

export const RenderBlockView: Component<{
  block: RenderBlock<ParsedBlockData>;
  index: number;
}> = (props) => {
  const blockData = () => props.block.data;

  return (
    <>
      {props.block.kind === "paragraph" && (
        <p
          data-velomark-block-id={props.block.id}
          data-velomark-block-index={props.index}
          data-velomark-block-kind={props.block.kind}
        >
          {(blockData() as ParagraphBlockData).text}
        </p>
      )}
      {props.block.kind === "heading" && (
        <p
          data-velomark-block-id={props.block.id}
          data-velomark-block-index={props.index}
          data-velomark-block-kind={props.block.kind}
          data-velomark-heading-depth={(blockData() as HeadingBlockData).depth}
        >
          {(blockData() as HeadingBlockData).text}
        </p>
      )}
      {props.block.kind === "blockquote" && (
        <blockquote
          data-velomark-block-id={props.block.id}
          data-velomark-block-index={props.index}
          data-velomark-block-kind={props.block.kind}
        >
          {(blockData() as BlockquoteBlockData).text}
        </blockquote>
      )}
      {props.block.kind === "list" && (
        <ul
          data-velomark-block-id={props.block.id}
          data-velomark-block-index={props.index}
          data-velomark-block-kind={props.block.kind}
          data-velomark-list-ordered={String(
            (blockData() as ListBlockData).ordered
          )}
        >
          {(blockData() as ListBlockData).items.map((item) => (
            <li>{item}</li>
          ))}
        </ul>
      )}
      {props.block.kind === "code" && (
        <pre
          data-velomark-block-id={props.block.id}
          data-velomark-block-index={props.index}
          data-velomark-block-kind={props.block.kind}
          data-velomark-language={(blockData() as CodeBlockData).language ?? ""}
        >
          <code>{(blockData() as CodeBlockData).code}</code>
        </pre>
      )}
      {props.block.kind === "thematic-break" && (
        <hr
          data-velomark-block-id={props.block.id}
          data-velomark-block-index={props.index}
          data-velomark-block-kind={props.block.kind}
        />
      )}
      {props.block.kind === "table" && (
        <table
          data-velomark-block-id={props.block.id}
          data-velomark-block-index={props.index}
          data-velomark-block-kind={props.block.kind}
        >
          <tbody>
            {(blockData() as TableBlockData).rows.map((row) => (
              <tr>
                {row.map((cell) => (
                  <td>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};
