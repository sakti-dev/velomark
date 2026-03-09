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
import { BlockquoteBlock } from "./blocks/blockquote-block";
import { CodeBlock } from "./blocks/code-block";
import { HeadingBlock } from "./blocks/heading-block";
import { ListBlock } from "./blocks/list-block";
import { ParagraphBlock } from "./blocks/paragraph-block";
import { TableBlock } from "./blocks/table-block";
import { ThematicBreakBlock } from "./blocks/thematic-break-block";

export const RenderBlockView: Component<{
  block: RenderBlock<ParsedBlockData>;
  index: number;
}> = (props) => {
  switch (props.block.kind) {
    case "paragraph":
      return (
        <ParagraphBlock
          block={props.block as RenderBlock<ParagraphBlockData>}
          index={props.index}
        />
      );
    case "heading":
      return (
        <HeadingBlock
          block={props.block as RenderBlock<HeadingBlockData>}
          index={props.index}
        />
      );
    case "blockquote":
      return (
        <BlockquoteBlock
          block={props.block as RenderBlock<BlockquoteBlockData>}
          index={props.index}
        />
      );
    case "list":
      return (
        <ListBlock
          block={props.block as RenderBlock<ListBlockData>}
          index={props.index}
        />
      );
    case "code":
      return (
        <CodeBlock
          block={props.block as RenderBlock<CodeBlockData>}
          index={props.index}
        />
      );
    case "thematic-break":
      return <ThematicBreakBlock blockId={props.block.id} index={props.index} />;
    case "table":
      return (
        <TableBlock
          block={props.block as RenderBlock<TableBlockData>}
          index={props.index}
        />
      );
    default:
      return (
        <ParagraphBlock
          block={
            {
              ...props.block,
              kind: "paragraph",
              data: {
                text:
                  "text" in (props.block.data as Record<string, unknown>)
                    ? String((props.block.data as { text?: unknown }).text ?? "")
                    : "",
              },
            } as RenderBlock<ParagraphBlockData>
          }
          index={props.index}
        />
      );
  }
};
