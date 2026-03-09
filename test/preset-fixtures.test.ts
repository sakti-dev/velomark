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
    expect(ids).toContain("recorded-chat-replay");
    expect(ids).toContain("chat-response");
    expect(ids).toContain("code-heavy");
    expect(ids).toContain("list-table");
    expect(ids).toContain("mixed-long");
  });
});
