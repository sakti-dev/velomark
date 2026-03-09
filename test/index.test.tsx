import { createRoot } from "solid-js";
import { isServer } from "solid-js/web";
import { describe, expect, it } from "vitest";
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
      expect(container.outerHTML).toBe(
        '<div data-velomark-root=""><p>Hello world</p></div>'
      );
    });
  });
});
