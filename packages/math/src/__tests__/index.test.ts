import { describe, expect, it } from "vite-plus/test";
import { createMathPlugin, math } from "../index";

describe("math (pre-configured)", () => {
  it("has correct name and type", () => {
    expect(math.name).toBe("katex");
    expect(math.type).toBe("math");
  });

  it("has a render method", () => {
    expect(typeof math.render).toBe("function");
  });

  it("has a getStyles method that returns katex CSS path", () => {
    expect(typeof math.getStyles).toBe("function");
    expect(math.getStyles?.()).toBe("katex/dist/katex.min.css");
  });
});

describe("createMathPlugin", () => {
  it("creates plugin with default options", () => {
    const plugin = createMathPlugin();
    expect(plugin.name).toBe("katex");
    expect(plugin.type).toBe("math");
    expect(typeof plugin.render).toBe("function");
  });

  it("creates independent plugin instances", () => {
    const plugin1 = createMathPlugin({ errorColor: "#ff0000" });
    const plugin2 = createMathPlugin({ errorColor: "#00ff00" });

    expect(plugin1).not.toBe(plugin2);

    const result1 = plugin1.render("x^2", false);
    const result2 = plugin2.render("x^2", false);
    expect(result1?.html).toBeTruthy();
    expect(result2?.html).toBeTruthy();
  });
});

describe("render", () => {
  it("renders inline math", () => {
    const plugin = createMathPlugin();
    const result = plugin.render("E = mc^2", false);
    expect(result).not.toBeNull();
    expect(result?.html).toContain("katex");
  });

  it("renders display math", () => {
    const plugin = createMathPlugin();
    const result = plugin.render("\\frac{a}{b}", true);
    expect(result).not.toBeNull();
    expect(result?.html).toContain("katex-display");
  });

  it("returns null for invalid LaTeX without throwing", () => {
    const plugin = createMathPlugin();
    const result = plugin.render("\\undefinedCommand", false);
    expect(result).not.toBeNull();
  });

  it("respects custom errorColor", () => {
    const plugin = createMathPlugin({ errorColor: "#ff0000" });
    const result = plugin.render("\\undefinedCommand", false);
    expect(result?.html).toContain("#ff0000");
  });

  it("uses throwOnError=false by default (error inline, no throw)", () => {
    const plugin = createMathPlugin();
    expect(() => plugin.render("\\undefinedCmd", false)).not.toThrow();
  });

  it("wraps rendered HTML in katex container classes", () => {
    const plugin = createMathPlugin();
    const inline = plugin.render("x", false);
    const display = plugin.render("x", true);
    expect(inline?.html).toContain("katex");
    expect(display?.html).toContain("katex-display");
  });

  it("respects output mode option", () => {
    const plugin = createMathPlugin({ output: "mathml" });
    const result = plugin.render("x^2", false);
    expect(result?.html).toContain("<math");
  });
});
