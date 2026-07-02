import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { Velomark } from "../velomark";

const mountedRoots: Array<() => void> = [];

afterEach(() => {
  while (mountedRoots.length > 0) {
    mountedRoots.pop()?.();
  }
  document.body.innerHTML = "";
});

describe("RTL dir prop", () => {
  it("does not set dir when prop is absent", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark markdown={"Hello world"} />, host);
    mountedRoots.push(dispose);

    const root = host.querySelector("[data-velomark-root]")!;
    expect(root.getAttribute("dir")).toBeNull();
  });

  it("sets dir=auto on container when dir prop is auto", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark dir="auto" markdown={"Hello world"} />, host);
    mountedRoots.push(dispose);

    const root = host.querySelector("[data-velomark-root]")!;
    expect(root.getAttribute("dir")).toBe("auto");
  });

  it("sets dir on paragraph elements when dir is auto", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(
      () => <Velomark dir="auto" markdown={"Hello\n\nsecond paragraph"} />,
      host,
    );
    mountedRoots.push(dispose);

    const paragraphs = host.querySelectorAll("p");
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(paragraphs[0]!.getAttribute("dir")).toBe("auto");
    expect(paragraphs[1]!.getAttribute("dir")).toBe("auto");
  });

  it("sets forced dir=rtl on all text blocks", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark dir="rtl" markdown={"# Heading\n\nParagraph"} />, host);
    mountedRoots.push(dispose);

    const heading = host.querySelector("h1")!;
    expect(heading.getAttribute("dir")).toBe("rtl");

    const paragraph = host.querySelector("p")!;
    expect(paragraph.getAttribute("dir")).toBe("rtl");
  });

  it("sets dir on heading elements", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark dir="auto" markdown={"# Title"} />, host);
    mountedRoots.push(dispose);

    const heading = host.querySelector("h1")!;
    expect(heading.getAttribute("dir")).toBe("auto");
  });

  it("sets dir on blockquote paragraphs", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark dir="auto" markdown={"> Quoted text"} />, host);
    mountedRoots.push(dispose);

    const quote = host.querySelector("blockquote p")!;
    expect(quote.getAttribute("dir")).toBe("auto");
  });

  it("sets dir on list items", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const dispose = render(() => <Velomark dir="auto" markdown={"- item one\n- item two"} />, host);
    mountedRoots.push(dispose);

    const items = host.querySelectorAll("li");
    expect(items.length).toBe(2);
    for (const item of items) {
      expect(item.getAttribute("dir")).toBe("auto");
    }
  });
});
