import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import App from "../dev/App";
import { PLAYGROUND_THEME_STORAGE_KEY } from "../dev/hooks/use-playground-theme";

const DEV_ENTRY_PATH = resolve(__dirname, "../dev/index.tsx");
const DEV_MAIN_CSS_PATH = resolve(__dirname, "../dev/main.css");

afterEach(() => {
  document.documentElement.classList.remove("dark");
  localStorage.removeItem(PLAYGROUND_THEME_STORAGE_KEY);
  document.body.innerHTML = "";
});

describe("playground theme contract", () => {
  it("loads the desktop token and markdown styles from the dev entry", () => {
    const entrySource = readFileSync(DEV_ENTRY_PATH, "utf8");
    const mainCssSource = readFileSync(DEV_MAIN_CSS_PATH, "utf8");

    expect(entrySource).toContain("./main.css");
    expect(mainCssSource).toContain('@import "tailwindcss";');
    expect(mainCssSource).toContain("../../../apps/desktop/src/assets/styles/tokens.css");
    expect(mainCssSource).toContain("../../../apps/desktop/src/assets/styles/markdown.css");
    expect(mainCssSource).toContain("../src/theme/styles.css");
  });

  it("keeps the desktop markdown scope around the rendered preview", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);

    const markdownRoot = container.querySelector(
      '.renderer-surface .markdown-content[data-component="markdown"]'
    );

    expect(markdownRoot).not.toBeNull();

    dispose();
    container.remove();
  });

  it("defaults the playground to desktop dark mode", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(PLAYGROUND_THEME_STORAGE_KEY)).toBe("dark");

    dispose();
    container.remove();
  });

  it("lets the user switch between light and dark mode with persisted state", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);

    const lightButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Light"
    );
    const darkButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Dark"
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
