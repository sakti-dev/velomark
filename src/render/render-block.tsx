import type { Component } from "solid-js";
import type {
  BlockquoteBlockData,
  CodeBlockData,
  ContainerBlockData,
  HeadingBlockData,
  HtmlBlockData,
  HtmlElementBlockData,
  ListBlockData,
  MathBlockData,
  ParagraphBlockData,
  ParsedBlockData,
  TableBlockData,
} from "../parser/block-boundaries";
import type {
  ReferenceDefinitionMap,
  RenderBlock,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
} from "../types";
import { BlockquoteBlock } from "./blocks/blockquote-block";
import { CodeBlock } from "./blocks/code-block";
import { ContainerBlock } from "./blocks/container-block";
import { HeadingBlock } from "./blocks/heading-block";
import { HtmlBlock } from "./blocks/html-block";
import { HtmlElementBlock } from "./blocks/html-element-block";
import { ListBlock } from "./blocks/list-block";
import { MathBlock } from "./blocks/math-block";
import { ParagraphBlock } from "./blocks/paragraph-block";
import { TableBlock } from "./blocks/table-block";
import { ThematicBreakBlock } from "./blocks/thematic-break-block";

export const RenderBlockView: Component<{
  block: RenderBlock<ParsedBlockData>;
  codeBlockRenderers?: Record<
    string,
    Component<VelomarkCodeBlockRendererProps>
  >;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  definitions?: ReferenceDefinitionMap;
  index: number;
}> = (props) => {
  switch (props.block.kind) {
    case "paragraph":
      return (
        <ParagraphBlock
          block={props.block as RenderBlock<ParagraphBlockData>}
          containers={props.containers}
          debug={props.debug}
          definitions={props.definitions}
          index={props.index}
        />
      );
    case "heading":
      return (
        <HeadingBlock
          block={props.block as RenderBlock<HeadingBlockData>}
          containers={props.containers}
          debug={props.debug}
          definitions={props.definitions}
          index={props.index}
        />
      );
    case "blockquote":
      return (
        <BlockquoteBlock
          block={props.block as RenderBlock<BlockquoteBlockData>}
          containers={props.containers}
          debug={props.debug}
          definitions={props.definitions}
          index={props.index}
        />
      );
    case "list":
      return (
        <ListBlock
          block={props.block as RenderBlock<ListBlockData>}
          containers={props.containers}
          debug={props.debug}
          definitions={props.definitions}
          index={props.index}
        />
      );
    case "code":
      return (
        <CodeBlock
          block={props.block as RenderBlock<CodeBlockData>}
          codeBlockRenderers={props.codeBlockRenderers}
          debug={props.debug}
          index={props.index}
        />
      );
    case "container":
      return (
        <ContainerBlock
          block={props.block as RenderBlock<ContainerBlockData>}
          codeBlockRenderers={props.codeBlockRenderers}
          containers={props.containers}
          debug={props.debug}
          definitions={props.definitions}
          index={props.index}
        />
      );
    case "html":
      return (
        <HtmlBlock
          block={props.block as RenderBlock<HtmlBlockData>}
          debug={props.debug}
          index={props.index}
        />
      );
    case "html-element":
      return (
        <HtmlElementBlock
          block={props.block as RenderBlock<HtmlElementBlockData>}
          debug={props.debug}
          index={props.index}
        />
      );
    case "math":
      return (
        <MathBlock
          block={props.block as RenderBlock<MathBlockData>}
          debug={props.debug}
          index={props.index}
        />
      );
    case "thematic-break":
      return (
        <ThematicBreakBlock
          blockId={props.block.id}
          debug={props.debug}
          index={props.index}
        />
      );
    case "table":
      return (
        <TableBlock
          block={props.block as RenderBlock<TableBlockData>}
          containers={props.containers}
          debug={props.debug}
          definitions={props.definitions}
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
          containers={props.containers}
          debug={props.debug}
          definitions={props.definitions}
          index={props.index}
        />
      );
  }
};
