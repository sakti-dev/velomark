import { describe, expect, it } from "vitest";
import { playgroundPresets } from "../dev/fixtures/presets";

describe("playground presets", () => {
  it("exposes named presets with deterministic markdown content", () => {
    expect(playgroundPresets.length).toBeGreaterThanOrEqual(4);
    expect(playgroundPresets[0]).toHaveProperty("id");
    expect(playgroundPresets[0]).toHaveProperty("label");
    expect(playgroundPresets[0]).toHaveProperty("description");
    expect(playgroundPresets[0]).toHaveProperty("markdown");
    expect(playgroundPresets.every((preset) => preset.markdown.length > 40)).toBe(
      true
    );
    expect(
      playgroundPresets.some((preset) => preset.markdown.length >= 5_000)
    ).toBe(true);
  });

  it("includes a long stress preset alongside chat- and code-oriented presets", () => {
    const ids = playgroundPresets.map((preset) => preset.id);

    expect(playgroundPresets[0]?.id).toBe("agent-replay");
    expect(ids).toContain("agent-replay");
    expect(ids).toContain("incremark-solid-example");
    expect(ids).toContain("mermaid-gallery");
    expect(ids).toContain("recorded-chat-replay");
    expect(ids).toContain("chat-response");
    expect(ids).toContain("code-heavy");
    expect(ids).toContain("list-table");
    expect(ids).toContain("mixed-long");
  });

  it("includes a mermaid-focused gallery preset with multiple diagram families", () => {
    const mermaidPreset = playgroundPresets.find(
      (preset) => preset.id === "mermaid-gallery"
    );

    expect(mermaidPreset).toBeDefined();
    expect(mermaidPreset?.markdown).toContain("```mermaid");
    expect(mermaidPreset?.markdown).toContain("sequenceDiagram");
    expect(mermaidPreset?.markdown).toContain("classDiagram");
    expect(mermaidPreset?.markdown).toContain("stateDiagram-v2");
    expect(mermaidPreset?.markdown).toContain("erDiagram");
    expect(mermaidPreset?.markdown).toContain("journey");
    expect(mermaidPreset?.markdown).toContain("gantt");
    expect(mermaidPreset?.markdown).toContain("mindmap");
    expect(mermaidPreset?.markdown).toContain("pie title");
  });

  it("includes the copied incremark solid example sample", () => {
    const incremarkPreset = playgroundPresets.find(
      (preset) => preset.id === "incremark-solid-example"
    );

    expect(incremarkPreset).toBeDefined();
    expect(incremarkPreset?.markdown).toContain("# 🚀 Incremark SolidJS Example");
    expect(incremarkPreset?.markdown).toContain("## 📊 Mermaid Charts");
    expect(incremarkPreset?.markdown).toContain("## 🎨 Custom Containers");
    expect(incremarkPreset?.markdown).toContain("## 💻 Code Highlighting");
    expect(incremarkPreset?.markdown.length ?? 0).toBeGreaterThan(8_000);
  });
});
