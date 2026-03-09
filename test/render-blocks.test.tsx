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

  it("renders code blocks with a generic shell and language label", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () => <Velomark markdown={"```ts\nconst answer = 42;\n```"} />,
      host
    );
    mountedRoots.push(dispose);

    const shell = host.querySelector('[data-velomark-block-kind="code"]');
    expect(shell?.tagName).toBe("DIV");
    expect(shell?.querySelector('[data-velomark-code-language]')?.textContent).toBe(
      "ts"
    );
    expect(shell?.querySelector("pre > code")?.textContent).toBe(
      "const answer = 42;"
    );
  });

  it("omits the language label for unlabeled code fences", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () => <Velomark markdown={"```\nplain text\n```"} />,
      host
    );
    mountedRoots.push(dispose);

    const shell = host.querySelector('[data-velomark-block-kind="code"]');
    expect(shell?.querySelector('[data-velomark-code-language]')).toBeNull();
    expect(shell?.querySelector("pre > code")?.textContent).toBe("plain text");
  });

  it("renders tables with a generic wrapper and column alignment", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () =>
        <Velomark
          markdown={[
            "| Left | Center | Right |",
            "| :--- | :----: | ---: |",
            "| A | B | C |",
          ].join("\n")}
        />,
      host
    );
    mountedRoots.push(dispose);

    const wrapper = host.querySelector('[data-velomark-table-wrapper]');
    expect(wrapper).not.toBeNull();

    const headers = Array.from(host.querySelectorAll("thead th"));
    expect(headers).toHaveLength(3);
    expect(headers[0]?.getAttribute("data-velomark-align")).toBe("left");
    expect(headers[1]?.getAttribute("data-velomark-align")).toBe("center");
    expect(headers[2]?.getAttribute("data-velomark-align")).toBe("right");

    const cells = Array.from(host.querySelectorAll("tbody td"));
    expect(cells).toHaveLength(3);
    expect(cells[0]?.getAttribute("data-velomark-align")).toBe("left");
    expect(cells[1]?.getAttribute("data-velomark-align")).toBe("center");
    expect(cells[2]?.getAttribute("data-velomark-align")).toBe("right");
  });
});
