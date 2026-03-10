import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRoot } from "solid-js";
import { isServer, render } from "solid-js/web";
import { describe, expect, it } from "vitest";
import App from "../dev/App";
import * as entry from "../src";
import { Velomark } from "../src";

const DEV_STYLES_PATH = resolve(__dirname, "../dev/styles.css");

describe("environment", () => {
  it("runs on client", () => {
    expect(typeof window).toBe("object");
    expect(isServer).toBe(false);
  });
});

describe("package surface", () => {
  it("exports the renderer entrypoint instead of starter placeholders", () => {
    expect(entry).toHaveProperty("Velomark");
    expect(entry).not.toHaveProperty("Hello");
    expect(entry).not.toHaveProperty("createHello");
  });
});

describe("Velomark", () => {
  it("renders a baseline markdown container", () => {
    createRoot(() => {
      const container = (
        <Velomark markdown={"Hello world"} />
      ) as HTMLDivElement;
      expect(container.outerHTML).toContain('data-velomark-root=""');
      expect(container.outerHTML).toContain('data-velomark-block-kind="paragraph"');
      expect(container.outerHTML).not.toContain("data-velomark-block-id");
      expect(container.textContent).toBe("Hello world");
    });
  });

  it("renders the playground shell with controls and renderer panel", () => {
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

  it("keeps the playground stylesheet free of a private color palette", () => {
    const source = readFileSync(DEV_STYLES_PATH, "utf8");

    expect(source).not.toMatch(/#[\da-fA-F]{3,8}\b/);
    expect(source).not.toMatch(/\brgba?\(/);
  });
});
