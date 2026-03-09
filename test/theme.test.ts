import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { velomarkColors, velomarkTokens } from "../src/theme/tokens";

describe("velomark theme surface", () => {
  it("exports baseline color tokens", () => {
    expect(velomarkColors).toMatchObject({
      text: expect.any(String),
      muted: expect.any(String),
      border: expect.any(String),
      accent: expect.any(String),
      codeBg: expect.any(String),
    });
  });

  it("exports baseline layout and typography tokens", () => {
    expect(velomarkTokens).toMatchObject({
      radius: expect.any(String),
      fontFamily: expect.any(String),
      lineHeight: expect.any(String),
      blockGap: expect.any(String),
      inlineCodePadding: expect.any(String),
    });
  });

  it("ships a consumable styles.css file", () => {
    const stylesPath = path.resolve(process.cwd(), "src/theme/styles.css");
    expect(existsSync(stylesPath)).toBe(true);
    const css = readFileSync(stylesPath, "utf8");

    expect(css).toContain(".velomark");
    expect(css).toContain("--velomark-color-text");
    expect(css).toContain("--velomark-block-gap");
  });
});
