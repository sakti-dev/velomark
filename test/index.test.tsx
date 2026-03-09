import { createRoot } from "solid-js";
import { isServer, render } from "solid-js/web";
import { describe, expect, it } from "vitest";
import App from "../dev/App";
import * as entry from "../src";
import { Velomark } from "../src";

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
});
