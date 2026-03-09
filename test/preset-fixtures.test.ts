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
  });

  it("includes chat- and code-oriented presets for playground coverage", () => {
    const ids = playgroundPresets.map((preset) => preset.id);

    expect(ids).toContain("chat-response");
    expect(ids).toContain("code-heavy");
    expect(ids).toContain("list-table");
    expect(ids).toContain("mixed-long");
  });
});
