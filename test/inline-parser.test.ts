import { describe, expect, it } from "vitest";
import { parseInline } from "../src/parser/inline-parser";

describe("parseInline", () => {
  it("parses plain text as a single text token", () => {
    expect(parseInline("Hello world")).toEqual([
      { type: "text", text: "Hello world" },
    ]);
  });

  it("parses inline code", () => {
    expect(parseInline("Use `pnpm test` now")).toEqual([
      { type: "text", text: "Use " },
      { type: "code", text: "pnpm test" },
      { type: "text", text: " now" },
    ]);
  });

  it("parses emphasis and strong tokens", () => {
    expect(parseInline("Mix *em* and **strong** text")).toEqual([
      { type: "text", text: "Mix " },
      { type: "emphasis", children: [{ type: "text", text: "em" }] },
      { type: "text", text: " and " },
      { type: "strong", children: [{ type: "text", text: "strong" }] },
      { type: "text", text: " text" },
    ]);
  });

  it("parses underscore emphasis and strong tokens", () => {
    expect(parseInline("Mix _em_ and __strong__ text")).toEqual([
      { type: "text", text: "Mix " },
      { type: "emphasis", children: [{ type: "text", text: "em" }] },
      { type: "text", text: " and " },
      { type: "strong", children: [{ type: "text", text: "strong" }] },
      { type: "text", text: " text" },
    ]);
  });

  it("parses inline links", () => {
    expect(parseInline("Open [docs](https://example.com)")).toEqual([
      { type: "text", text: "Open " },
      {
        type: "link",
        href: "https://example.com",
        children: [{ type: "text", text: "docs" }],
      },
    ]);
  });

  it("preserves escaped punctuation as literal text", () => {
    expect(parseInline(String.raw`\*literal\* \[link\]`)).toEqual([
      { type: "text", text: "*literal* [link]" },
    ]);
  });

  it("parses mixed inline content deterministically", () => {
    expect(
      parseInline("See **docs** at [site](https://example.com) and `run`")
    ).toEqual([
      { type: "text", text: "See " },
      { type: "strong", children: [{ type: "text", text: "docs" }] },
      { type: "text", text: " at " },
      {
        type: "link",
        href: "https://example.com",
        children: [{ type: "text", text: "site" }],
      },
      { type: "text", text: " and " },
      { type: "code", text: "run" },
    ]);
  });

  it("parses strikethrough tokens", () => {
    expect(parseInline("Use ~~old~~ behavior")).toEqual([
      { type: "text", text: "Use " },
      { type: "delete", children: [{ type: "text", text: "old" }] },
      { type: "text", text: " behavior" },
    ]);
  });
});
