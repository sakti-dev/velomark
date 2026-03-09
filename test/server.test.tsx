import { isServer, renderToString } from "solid-js/web";
import { describe, expect, it } from "vitest";
import * as entry from "../src";
import { Velomark } from "../src";

describe("environment", () => {
  it("runs on server", () => {
    expect(typeof window).toBe("undefined");
    expect(isServer).toBe(true);
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
  it("renders markdown on the server", () => {
    const string = renderToString(() => <Velomark markdown={"Hello world"} />);
    expect(string).toBe('<div data-velomark-root=""><p>Hello world</p></div>');
  });
});
