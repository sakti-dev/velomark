import type { Component } from "solid-js";
import { useBlock } from "../lib/block-context";
import { BlockquoteBlock } from "./blocks/blockquote-block";
import { CodeBlockView } from "./blocks/code-block";
import { ContainerBlock } from "./blocks/container-block";
import { HeadingBlock } from "./blocks/heading-block";
import { HtmlBlock } from "./compat/html/html-block";
import { HtmlElementBlock } from "./compat/html/html-element-block";
import { ListBlock } from "./blocks/list-block";
import { MathBlock } from "./compat/math/math-block";
import { ParagraphBlock } from "./blocks/paragraph-block";
import { ThematicBreakBlock } from "./blocks/thematic-break-block";
import { Table } from "./table";

export const RenderBlockView: Component = () => {
  const { block } = useBlock();

  switch (block.kind) {
    case "paragraph":
      return <ParagraphBlock />;
    case "heading":
      return <HeadingBlock />;
    case "blockquote":
      return <BlockquoteBlock />;
    case "list":
      return <ListBlock />;
    case "code":
      return <CodeBlockView />;
    case "container":
      return <ContainerBlock />;
    case "html":
      return <HtmlBlock />;
    case "html-element":
      return <HtmlElementBlock />;
    case "math":
      return <MathBlock />;
    case "thematic-break":
      return <ThematicBreakBlock />;
    case "table":
      return <Table />;
    default:
      return <ParagraphBlock />;
  }
};
