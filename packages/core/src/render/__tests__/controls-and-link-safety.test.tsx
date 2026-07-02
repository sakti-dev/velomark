import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { ControlsConfig } from "../../types";
import { Velomark } from "../velomark";
import { mockMermaidPlugin } from "../../../test/mock-plugins";

const mountedRoots: Array<() => void> = [];

afterEach(() => {
  while (mountedRoots.length > 0) {
    mountedRoots.pop()?.();
  }
  document.body.innerHTML = "";
});

describe("controls config — table", () => {
  const tableMarkdown = ["| Name | Value |", "| --- | --- |", "| A | 1 |"].join("\n");

  it("renders all table controls by default", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark markdown={tableMarkdown} />, host);
    mountedRoots.push(dispose);

    const actions = host.querySelector('[data-velomark="table-actions"]');
    expect(actions).not.toBeNull();
    expect(actions!.querySelectorAll("button").length).toBeGreaterThanOrEqual(3);
  });

  it("hides copy button when controls.table.copy is false", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const controls: ControlsConfig = { table: { copy: false } };
    const dispose = render(() => <Velomark controls={controls} markdown={tableMarkdown} />, host);
    mountedRoots.push(dispose);

    const copyBtn = host.querySelector('[title="Copy table"]');
    expect(copyBtn).toBeNull();
  });

  it("hides fullscreen button when controls.table.fullscreen is false", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const controls: ControlsConfig = { table: { fullscreen: false } };
    const dispose = render(() => <Velomark controls={controls} markdown={tableMarkdown} />, host);
    mountedRoots.push(dispose);

    const fullscreenBtn = host.querySelector('[title="View fullscreen"]');
    expect(fullscreenBtn).toBeNull();
  });
});

describe("controls config — mermaid", () => {
  const mermaidMarkdown = "```mermaid\ngraph TD\nA-->B\n```";

  it("hides fullscreen button when controls.mermaid.fullscreen is false", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const controls: ControlsConfig = { mermaid: { fullscreen: false } };
    const dispose = render(
      () => (
        <Velomark
          controls={controls}
          markdown={mermaidMarkdown}
          plugins={{ mermaid: mockMermaidPlugin }}
        />
      ),
      host,
    );
    mountedRoots.push(dispose);

    const fullscreenBtn = host.querySelector('[title="View fullscreen"]');
    expect(fullscreenBtn).toBeNull();
  });
});

describe("link safety modal", () => {
  it("opens modal on link click when linkSafety is enabled", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(
      () => <Velomark linkSafety markdown={"[Click me](https://example.com)"} />,
      host,
    );
    mountedRoots.push(dispose);

    const link = host.querySelector("a")!;
    expect(link).not.toBeNull();

    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    const modal = document.querySelector('[data-velomark="link-safety-modal"]');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain("https://example.com");
  });

  it("does not open modal when linkSafety is not set", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark markdown={"[Click me](https://example.com)"} />, host);
    mountedRoots.push(dispose);

    const link = host.querySelector("a")!;
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    const modal = document.querySelector('[data-velomark="link-safety-modal"]');
    expect(modal).toBeNull();
  });

  it("closes modal on close button click", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(
      () => <Velomark linkSafety markdown={"[Click me](https://example.com)"} />,
      host,
    );
    mountedRoots.push(dispose);

    const link = host.querySelector("a")!;
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    const modal = document.querySelector('[data-velomark="link-safety-modal"]');
    expect(modal).not.toBeNull();

    const closeBtn = modal!.querySelector('[title="Close"]') as HTMLButtonElement;
    closeBtn.click();

    const modalAfter = document.querySelector('[data-velomark="link-safety-modal"]');
    expect(modalAfter).toBeNull();
  });

  it("opens URL on confirm and closes modal", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const dispose = render(
      () => <Velomark linkSafety markdown={"[Click me](https://example.com)"} />,
      host,
    );
    mountedRoots.push(dispose);

    const link = host.querySelector("a")!;
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    const modal = document.querySelector('[data-velomark="link-safety-modal"]');

    const openBtn = Array.from(modal!.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Open link"),
    ) as HTMLButtonElement;
    openBtn.click();

    expect(openSpy).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");

    const modalAfter = document.querySelector('[data-velomark="link-safety-modal"]');
    expect(modalAfter).toBeNull();

    openSpy.mockRestore();
  });
});
