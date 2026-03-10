import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "solid-js/web";
import { describe, expect, it } from "vitest";
import App from "../dev/App";

const DEV_ENTRY_PATH = resolve(__dirname, "../dev/index.tsx");
const DEV_MAIN_CSS_PATH = resolve(__dirname, "../dev/main.css");

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
});
