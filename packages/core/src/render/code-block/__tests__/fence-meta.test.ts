import { describe, expect, it } from "vite-plus/test";
import { parseCodeFenceMeta } from "../fence-meta";

describe("parseCodeFenceMeta", () => {
  it("returns defaults when meta is undefined", () => {
    expect(parseCodeFenceMeta(undefined)).toEqual({ lineNumbers: true, startLine: 1 });
  });

  it("detects noLineNumbers", () => {
    expect(parseCodeFenceMeta("noLineNumbers")).toEqual({ lineNumbers: false, startLine: 1 });
  });

  it("detects startLine=N", () => {
    expect(parseCodeFenceMeta("startLine=10")).toEqual({ lineNumbers: true, startLine: 10 });
  });

  it("parses both startLine and noLineNumbers together", () => {
    expect(parseCodeFenceMeta("startLine=10 noLineNumbers")).toEqual({
      lineNumbers: false,
      startLine: 10,
    });
  });

  it("clamps startLine below 1 to 1", () => {
    expect(parseCodeFenceMeta("startLine=0").startLine).toBe(1);
    expect(parseCodeFenceMeta("startLine=-5").startLine).toBe(1);
  });

  it("ignores startLine that is not a number", () => {
    expect(parseCodeFenceMeta("startLine=abc").startLine).toBe(1);
  });

  it("defaults lineNumbers to true for unrelated meta", () => {
    expect(parseCodeFenceMeta('title="example"').lineNumbers).toBe(true);
  });
});
