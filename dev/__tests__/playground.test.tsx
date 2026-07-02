import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "solid-js/web";
import { describe, expect, it } from "vite-plus/test";
import App from "../app";

const DEV_STYLES_PATH = resolve(import.meta.dirname, "../styles.css");
const HEX_COLOR_RE = /#[\da-fA-F]{3,8}\b/;
const RGBA_RE = /\brgba?\(/;

describe("playground", () => {
  it("renders the shell with controls and renderer panel", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);

    expect(container.textContent).toContain("Velomark Playground");
    expect(container.textContent).toContain("Render once");
    expect(container.textContent).toContain("Simulate stream");
    expect(container.textContent).toContain("Diagnostics");
    expect(container.textContent).toContain("Renderer Viewport");

    dispose();
    container.remove();
  });

  it("keeps the stylesheet free of a private color palette", () => {
    const source = readFileSync(DEV_STYLES_PATH, "utf8");

    expect(source).not.toMatch(HEX_COLOR_RE);
    expect(source).not.toMatch(RGBA_RE);
  });

  it("overrides the root overflow lock so the playground can scroll", () => {
    const source = readFileSync(DEV_STYLES_PATH, "utf8");

    expect(source).toContain("html,");
    expect(source).toContain("body,");
    expect(source).toContain("#root");
    expect(source).toContain("overflow: auto;");
    expect(source).toContain("height: auto;");
  });
});
