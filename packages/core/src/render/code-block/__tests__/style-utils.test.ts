import { describe, expect, it } from "vitest";
import { buildTokenStyle, parseShikiStyle } from "../style-utils";

describe("parseShikiStyle", () => {
  it("extracts plain light value and dark CSS vars from dual-theme bg", () => {
    const result = parseShikiStyle("#fff;--shiki-dark-bg:#24292e", "--vm-bg");
    expect(result).toEqual({
      "--vm-bg": "#fff",
      "--shiki-dark-bg": "#24292e",
    });
  });

  it("handles single-theme plain color (no semicolons)", () => {
    const result = parseShikiStyle("#24292e", "--vm-bg");
    expect(result).toEqual({ "--vm-bg": "#24292e" });
  });

  it("handles rootStyle with only CSS var declarations", () => {
    const result = parseShikiStyle("--shiki-dark-bg:#24292e;--shiki-dark:#e1e4e8", "--vm-bg");
    expect(result).toEqual({
      "--shiki-dark-bg": "#24292e",
      "--shiki-dark": "#e1e4e8",
    });
  });

  it("returns empty object for undefined input", () => {
    expect(parseShikiStyle(undefined, "--vm-bg")).toEqual({});
    expect(parseShikiStyle(false, "--vm-bg")).toEqual({});
  });
});

describe("buildTokenStyle", () => {
  it("redirects direct color to --vm-c (single-theme mode)", () => {
    const result = buildTokenStyle({ content: "x", color: "#F97583" });
    expect(result).toEqual({ "--vm-c": "#F97583" });
  });

  it("redirects htmlStyle.color to --vm-c and passes --shiki-dark through (dual-theme)", () => {
    const result = buildTokenStyle({
      content: "x",
      htmlStyle: "color:#D73A49;--shiki-dark:#F97583",
    });
    expect(result).toEqual({
      "--vm-c": "#D73A49",
      "--shiki-dark": "#F97583",
    });
  });

  it("redirects background-color to --vm-tbg", () => {
    const result = buildTokenStyle({
      content: "x",
      bgColor: "#fff",
      htmlStyle: "background-color:#eee;--shiki-dark-bg:#333",
    });
    expect(result).toEqual({
      "--vm-tbg": "#eee",
      "--shiki-dark-bg": "#333",
    });
  });

  it("passes through non-color htmlStyle properties as-is", () => {
    const result = buildTokenStyle({
      content: "x",
      htmlStyle: "font-weight:bold;--shiki-dark:#F97583",
    });
    expect(result).toEqual({
      "--shiki-dark": "#F97583",
      "font-weight": "bold",
    });
  });
});
