import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { Velomark } from "../src";

const mountedRoots: Array<() => void> = [];

afterEach(() => {
  while (mountedRoots.length > 0) {
    mountedRoots.pop()?.();
  }
  document.body.innerHTML = "";
});

describe("Velomark block rendering", () => {
  it("renders supported block kinds with semantic elements", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const markdown = [
      "# Heading",
      "",
      "Paragraph with **strong** and `code`.",
      "",
      "> Quote line",
      "",
      "1. One",
      "2. Two",
      "",
      "```ts",
      "const x = 1;",
      "```",
      "",
      "---",
      "",
      "| Name | Value |",
      "| --- | --- |",
      "| A | 1 |",
    ].join("\n");

    const dispose = render(() => <Velomark markdown={markdown} />, host);
    mountedRoots.push(dispose);

    expect(host.querySelector("h1")?.textContent).toBe("Heading");
    expect(host.querySelector("p strong")?.textContent).toBe("strong");
    expect(host.querySelector("p code")?.textContent).toBe("code");
    expect(host.querySelector("blockquote")?.textContent).toBe("Quote line");
    expect(host.querySelectorAll("blockquote > p")).toHaveLength(1);
    expect(host.querySelector("ol")).not.toBeNull();
    expect(host.querySelectorAll("ol > li")).toHaveLength(2);
    expect(host.querySelector("pre > code")?.textContent).toBe("const x = 1;");
    expect(host.querySelector("hr")).not.toBeNull();
    expect(host.querySelectorAll("table thead th")).toHaveLength(2);
    expect(host.querySelectorAll("table tbody tr")).toHaveLength(1);
    expect(host.querySelector("[data-velomark-block-id]")).toBeNull();
  });

  it("preserves an unchanged heading node across later tail updates", async () => {
    const host = document.createElement("div");
    document.body.append(host);

    const [markdown, setMarkdown] = createSignal("# Heading");
    const dispose = render(() => <Velomark markdown={markdown()} />, host);
    mountedRoots.push(dispose);

    const headingBefore = host.querySelector("h1");
    expect(headingBefore?.textContent).toBe("Heading");

    setMarkdown("# Heading\n\nTail paragraph");
    await Promise.resolve();

    const headingAfter = host.querySelector("h1");
    expect(headingAfter).toBe(headingBefore);
    expect(headingAfter?.textContent).toBe("Heading");
  });

  it("renders blockquotes as paragraph children instead of inline line breaks", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const markdown = ["> First quoted paragraph", ">", "> Second quoted paragraph"].join(
      "\n"
    );

    const dispose = render(() => <Velomark markdown={markdown} />, host);
    mountedRoots.push(dispose);

    const paragraphs = Array.from(host.querySelectorAll("blockquote > p"));
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]?.textContent).toBe("First quoted paragraph");
    expect(paragraphs[1]?.textContent).toBe("Second quoted paragraph");
    expect(host.querySelector("blockquote br")).toBeNull();
  });

  it("renders task list items with disabled checkboxes", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () => <Velomark markdown={["- [ ] Todo", "- [x] Done"].join("\n")} />,
      host
    );
    mountedRoots.push(dispose);

    const checkboxes = Array.from(
      host.querySelectorAll('ul input[type="checkbox"]')
    ) as HTMLInputElement[];
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]?.disabled).toBe(true);
    expect(checkboxes[0]?.checked).toBe(false);
    expect(checkboxes[1]?.disabled).toBe(true);
    expect(checkboxes[1]?.checked).toBe(true);
    expect(host.textContent).toContain("Todo");
    expect(host.textContent).toContain("Done");
  });
});
