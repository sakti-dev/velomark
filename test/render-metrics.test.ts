import { describe, expect, it } from "vitest";
import { collectRenderMetrics } from "../src/model/render-document";
import { parseMarkdownToBlocks } from "../src/parser/block-parser";

describe("render metrics", () => {
  it("reports reused and appended blocks for append-only updates", () => {
    const previousBlocks = parseMarkdownToBlocks("Alpha");
    const nextBlocks = parseMarkdownToBlocks("Alpha\n\nBeta");

    const metrics = collectRenderMetrics(previousBlocks, nextBlocks);

    expect(metrics.blockCount).toBe(2);
    expect(metrics.reusedBlockCount).toBe(1);
    expect(metrics.appendedBlockCount).toBe(1);
    expect(metrics.replacedBlockCount).toBe(0);
  });

  it("reports replaced suffix blocks for tail rewrites", () => {
    const previousBlocks = parseMarkdownToBlocks("Alpha\n\nBeta");
    const nextBlocks = parseMarkdownToBlocks("Alpha\n\nGamma");

    const metrics = collectRenderMetrics(previousBlocks, nextBlocks);

    expect(metrics.blockCount).toBe(2);
    expect(metrics.reusedBlockCount).toBe(1);
    expect(metrics.replacedBlockCount).toBe(1);
    expect(metrics.appendedBlockCount).toBe(0);
  });
});
