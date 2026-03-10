import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { Velomark } from "../src";

const mountedRoots: Array<() => void> = [];

const loadFixture = (name: string): string =>
  readFileSync(resolve(process.cwd(), "test/fixtures/streaming", name), "utf8");

afterEach(() => {
  while (mountedRoots.length > 0) {
    mountedRoots.pop()?.();
  }
  document.body.innerHTML = "";
});

describe("Velomark streaming edge cases", () => {
  it("keeps rendering stable while a fenced code block is unfinished", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const [markdown, setMarkdown] = createSignal(loadFixture("unfinished-fence.md"));

    const dispose = render(() => <Velomark markdown={markdown()} />, host);
    mountedRoots.push(dispose);

    expect(host.querySelector('[data-velomark-block-kind="code"]')).not.toBeNull();
    expect(host.querySelector("pre > code")?.textContent).toContain("const answer =");

    setMarkdown([loadFixture("unfinished-fence.md"), "42;", "```"].join(""));
    await Promise.resolve();

    expect(host.querySelector("pre > code")?.textContent).toContain("const answer =\n42;");
  });

  it("upgrades unresolved references when the definition arrives later", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const [markdown, setMarkdown] = createSignal(
      loadFixture("unfinished-reference.md")
    );

    const dispose = render(() => <Velomark markdown={markdown()} />, host);
    mountedRoots.push(dispose);

    expect(host.querySelector("a")).toBeNull();
    expect(host.textContent).toContain("[docs][guide]");

    setMarkdown(
      `${loadFixture("unfinished-reference.md")}\n[guide]: https://example.com/docs\n`
    );
    await Promise.resolve();

    expect(host.querySelector("a")?.getAttribute("href")).toBe(
      "https://example.com/docs"
    );
    expect(host.querySelector("a")?.textContent).toBe("docs");
  });

  it("does not collapse the document while html is still incomplete", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const [markdown, setMarkdown] = createSignal(loadFixture("unfinished-html.md"));

    const dispose = render(() => <Velomark markdown={markdown()} />, host);
    mountedRoots.push(dispose);

    expect(host.textContent).toContain("Text with");

    setMarkdown("Text with <span>hi</span>");
    await Promise.resolve();

    expect(host.querySelector("span")?.textContent).toBe("hi");
  });

  it("keeps rendering a document while a directive block is incomplete", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const [markdown, setMarkdown] = createSignal(
      loadFixture("unfinished-directive.md")
    );

    const dispose = render(() => <Velomark markdown={markdown()} />, host);
    mountedRoots.push(dispose);

    expect(host.textContent).toContain("Alpha paragraph.");

    setMarkdown(
      `${loadFixture("unfinished-directive.md")}\n:::`
    );
    await Promise.resolve();

    expect(host.querySelector('[data-velomark-container="info"]')).not.toBeNull();
  });

  it("keeps rendering while a table is incomplete and upgrades when it stabilizes", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const [markdown, setMarkdown] = createSignal(loadFixture("unfinished-table.md"));

    const dispose = render(() => <Velomark markdown={markdown()} />, host);
    mountedRoots.push(dispose);

    expect(host.textContent).toContain("Name");
    expect(host.textContent).toContain("Value");

    setMarkdown([
      "| Name | Value |",
      "| --- | --- |",
      "| A | 1 |",
      "| B | 2 |",
    ].join("\n"));
    await Promise.resolve();

    expect(host.querySelectorAll("table tbody tr")).toHaveLength(2);
  });
});
