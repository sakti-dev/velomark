import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vite-plus/test";
import App from "../app";
import { PLAYGROUND_THEME_STORAGE_KEY } from "../hooks/use-playground-theme";

const DEV_ENTRY_PATH = resolve(import.meta.dirname, "../index.tsx");
const DEV_MAIN_CSS_PATH = resolve(import.meta.dirname, "../main.css");

afterEach(() => {
  document.documentElement.classList.remove("dark");
  localStorage.removeItem(PLAYGROUND_THEME_STORAGE_KEY);
  document.body.innerHTML = "";
});

describe("playground theme contract", () => {
  it("loads tailwind, the velomark styles, and a shadcn token block from the dev entry", () => {
    const entrySource = readFileSync(DEV_ENTRY_PATH, "utf8");
    const mainCssSource = readFileSync(DEV_MAIN_CSS_PATH, "utf8");

    expect(entrySource).toContain("./main.css");
    expect(mainCssSource).toContain('@import "tailwindcss";');
    expect(mainCssSource).toContain("../packages/core/styles.css");
    expect(mainCssSource).toContain("@custom-variant dark");
    expect(mainCssSource).toContain("--color-background: var(--background)");
    expect(mainCssSource).toContain(".dark {");
  });

  it("keeps the markdown scope around the rendered preview", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);

    const markdownRoot = container.querySelector(
      '.renderer-surface .markdown-content[data-component="markdown"]',
    );

    expect(markdownRoot).not.toBeNull();

    dispose();
    container.remove();
  });

  it("defaults the playground to dark mode via the .dark class on <html>", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(PLAYGROUND_THEME_STORAGE_KEY)).toBe("dark");

    dispose();
    container.remove();
  });

  it("does not emit inline velomark token vars on the root (theming is CSS-driven)", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);

    const root = container.querySelector("[data-velomark-root]") as HTMLDivElement | null;
    expect(root).not.toBeNull();
    expect(root?.style.cssText).toBe("");

    dispose();
    container.remove();
  });

  it("lets the user switch between light and dark mode with persisted state", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);

    const lightButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Light",
    );
    const darkButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Dark",
    );

    expect(lightButton).toBeDefined();
    expect(darkButton).toBeDefined();

    lightButton?.click();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem(PLAYGROUND_THEME_STORAGE_KEY)).toBe("light");

    darkButton?.click();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(PLAYGROUND_THEME_STORAGE_KEY)).toBe("dark");

    dispose();
    container.remove();
  });
});
