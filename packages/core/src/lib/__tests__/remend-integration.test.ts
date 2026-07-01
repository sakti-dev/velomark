import { describe, expect, it } from "vite-plus/test";
import { parseMarkdownToBlocks } from "../parser/block-parser";

describe("parseMarkdownToBlocks with remend", () => {
  it("heals unclosed bold formatting", () => {
    const { blocks } = parseMarkdownToBlocks("This is **bold text", {});
    expect(blocks[0]?.data).toMatchObject({ text: expect.stringContaining("**bold text**") });
  });

  it("heals unclosed italic formatting", () => {
    const { blocks } = parseMarkdownToBlocks("This is *italic text", {});
    expect(blocks[0]?.data).toMatchObject({ text: expect.stringContaining("*italic text*") });
  });

  it("heals unclosed inline code", () => {
    const { blocks } = parseMarkdownToBlocks("Use `console.log", {});
    expect(blocks[0]?.data).toMatchObject({ text: expect.stringContaining("`console.log`") });
  });

  it("heals unclosed strikethrough", () => {
    const { blocks } = parseMarkdownToBlocks("This is ~~struck", {});
    expect(blocks[0]?.data).toMatchObject({ text: expect.stringContaining("~~struck~~") });
  });

  it("heals unclosed link with placeholder URL", () => {
    const { blocks } = parseMarkdownToBlocks("Check [this link](https://exa", {});
    expect(blocks[0]?.data).toMatchObject({
      text: expect.stringContaining("[this link](streamdown:incomplete-link)"),
    });
  });

  it("does not heal when remendOptions is undefined", () => {
    const { blocks } = parseMarkdownToBlocks("This is **bold text");
    expect(blocks[0]?.data).toMatchObject({ text: "This is **bold text" });
  });

  it("is idempotent on complete markdown", () => {
    const complete = "This is **bold** and *italic*";
    const { blocks } = parseMarkdownToBlocks(complete, {});
    expect(blocks[0]?.data).toMatchObject({ text: complete });
  });

  it("respects code blocks — does not heal inside fenced code", () => {
    const markdown = ["```ts", "const x = 'unclosed **bold", "```"].join("\n");
    const { blocks } = parseMarkdownToBlocks(markdown, {});
    expect(blocks[0]?.data).toMatchObject({ code: expect.stringContaining("**bold") });
    expect(blocks[0]?.data).not.toMatchObject({ code: expect.stringContaining("**bold**") });
  });

  it("respects custom option to disable bold healing", () => {
    const { blocks: withHealing } = parseMarkdownToBlocks("This is **bold", {});
    const { blocks: withoutBold } = parseMarkdownToBlocks("This is **bold", { bold: false });
    expect((withHealing[0]?.data as { text: string }).text).toContain("**bold**");
    expect((withoutBold[0]?.data as { text: string }).text).toBe("This is **bold");
  });
});
