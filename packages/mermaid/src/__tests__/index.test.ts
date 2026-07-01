import { describe, expect, it, vi } from "vite-plus/test";
import { createMermaidPlugin, mermaid } from "../index";

describe("mermaid (pre-configured)", () => {
  it("has correct name and type", () => {
    expect(mermaid.name).toBe("mermaid");
    expect(mermaid.type).toBe("diagram");
  });

  it("has correct language identifier", () => {
    expect(mermaid.language).toBe("mermaid");
  });

  it("has getMermaid method", () => {
    expect(typeof mermaid.getMermaid).toBe("function");
  });
});

describe("createMermaidPlugin", () => {
  it("creates plugin with default options", () => {
    const plugin = createMermaidPlugin();
    expect(plugin.name).toBe("mermaid");
    expect(plugin.type).toBe("diagram");
    expect(plugin.language).toBe("mermaid");
  });

  it("creates plugin with custom config", () => {
    const plugin = createMermaidPlugin({
      config: {
        theme: "forest",
        fontFamily: "Arial",
      },
    });
    expect(plugin.name).toBe("mermaid");
  });

  it("creates independent plugin instances", () => {
    const plugin1 = createMermaidPlugin();
    const plugin2 = createMermaidPlugin();

    expect(plugin1).not.toBe(plugin2);
    expect(plugin1.getMermaid).not.toBe(plugin2.getMermaid);
  });
});

describe("MermaidInstance", () => {
  it("returns a mermaid instance from getMermaid", () => {
    const plugin = createMermaidPlugin();
    const instance = plugin.getMermaid();
    expect(instance).toBeDefined();
    expect(typeof instance.initialize).toBe("function");
    expect(typeof instance.render).toBe("function");
  });

  it("accepts config on getMermaid call", () => {
    const plugin = createMermaidPlugin();
    const instance = plugin.getMermaid({ theme: "dark" });
    expect(instance).toBeDefined();
  });

  it("auto-initializes when render is called without explicit initialization", async () => {
    const plugin = createMermaidPlugin();
    const instance = plugin.getMermaid();

    const diagram = `graph TD
      A[Test] --> B[Auto Init]`;

    const result = await instance.render("auto-init-test", diagram);
    expect(result).toHaveProperty("svg");
    expect(typeof result.svg).toBe("string");
    expect(result.svg).toContain("svg");
  });

  it("renders a diagram", async () => {
    const plugin = createMermaidPlugin();
    const instance = plugin.getMermaid();

    const diagram = `graph TD
      A[Start] --> B[End]`;

    const result = await instance.render("test-diagram", diagram);
    expect(result).toHaveProperty("svg");
    expect(typeof result.svg).toBe("string");
    expect(result.svg).toContain("svg");
  });

  it("handles invalid diagram gracefully", async () => {
    const plugin = createMermaidPlugin();
    const instance = plugin.getMermaid();

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      await instance.render("invalid-test", "not a valid diagram %%%");
    } catch {
      // Expected to throw for invalid diagram
    }

    consoleSpy.mockRestore();
  });
});
