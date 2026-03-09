import { describe, expect, it } from "vitest";
import { parseBlockBoundaries } from "../src/parser/block-boundaries";

describe("parseBlockBoundaries", () => {
  it("parses headings, paragraphs, blockquotes, lists, code fences, thematic breaks, and tables", () => {
    const markdown = [
      "# Heading",
      "",
      "Paragraph text",
      "",
      "> Quote line 1",
      "> Quote line 2",
      "",
      "- First item",
      "- Second item",
      "",
      "```ts",
      "const x = 1;",
      "```",
      "",
      "---",
      "",
      "| Name | Value |",
      "| --- | --- |",
      "| A | 1 |",
    ].join("\n");

    const blocks = parseBlockBoundaries(markdown);

    expect(blocks.map((block) => block.kind)).toEqual([
      "heading",
      "paragraph",
      "blockquote",
      "list",
      "code",
      "thematic-break",
      "table",
    ]);

    expect(blocks[0]?.data).toMatchObject({
      depth: 1,
      text: "Heading",
    });
    expect(blocks[1]?.data).toMatchObject({
      text: "Paragraph text",
    });
    expect(blocks[2]?.data).toMatchObject({
      text: "Quote line 1\nQuote line 2",
    });
    expect(blocks[3]?.data).toMatchObject({
      ordered: false,
      items: ["First item", "Second item"],
    });
    expect(blocks[4]?.data).toMatchObject({
      language: "ts",
      code: "const x = 1;",
    });
    expect(blocks[5]?.data).toMatchObject({});
    expect(blocks[6]?.data).toMatchObject({
      rows: [
        ["Name", "Value"],
        ["A", "1"],
      ],
    });
  });

  it("parses ordered lists separately from unordered lists", () => {
    const blocks = parseBlockBoundaries(["1. One", "2. Two"].join("\n"));

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.kind).toBe("list");
    expect(blocks[0]?.data).toMatchObject({
      ordered: true,
      items: ["One", "Two"],
    });
  });

  it("marks an unterminated code fence as streaming", () => {
    const blocks = parseBlockBoundaries(["```ts", "const x = 1;"].join("\n"));

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.kind).toBe("code");
    expect(blocks[0]?.status).toBe("streaming");
  });
});
