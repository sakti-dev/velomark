import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { RenderInline } from "../src/render/inline/render-inline";

const mountedRoots: Array<() => void> = [];

afterEach(() => {
  while (mountedRoots.length > 0) {
    mountedRoots.pop()?.();
  }
  document.body.innerHTML = "";
});

describe("RenderInline", () => {
  it("renders links with safe external attributes", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () => <RenderInline text="Open [docs](https://example.com)" />,
      host
    );
    mountedRoots.push(dispose);

    const link = host.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.com");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("renders strikethrough inline tokens", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(() => <RenderInline text="Use ~~old~~ behavior" />, host);
    mountedRoots.push(dispose);

    const strike = host.querySelector("del");
    expect(strike?.textContent).toBe("old");
  });

  it("renders inline images with alt and lazy loading", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () =>
        <RenderInline text="Logo ![alt text](https://example.com/logo.png)" />,
      host
    );
    mountedRoots.push(dispose);

    const image = host.querySelector("img");
    expect(image?.getAttribute("src")).toBe("https://example.com/logo.png");
    expect(image?.getAttribute("alt")).toBe("alt text");
    expect(image?.getAttribute("loading")).toBe("lazy");
  });

  it("renders resolved reference-style links", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () =>
        <RenderInline
          definitions={{ guide: { href: "https://example.com/guide" } }}
          text="Open [docs][guide]"
        />,
      host
    );
    mountedRoots.push(dispose);

    const link = host.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.com/guide");
    expect(link?.textContent).toBe("docs");
  });

  it("renders collapsed reference-style links with titles", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () =>
        <RenderInline
          definitions={{
            docs: { href: "https://example.com/guide", title: "Guide" },
          }}
          text="Open [docs][]"
        />,
      host
    );
    mountedRoots.push(dispose);

    const link = host.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.com/guide");
    expect(link?.getAttribute("title")).toBe("Guide");
    expect(link?.textContent).toBe("docs");
  });

  it("renders shortcut reference-style images with titles", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () =>
        <RenderInline
          definitions={{
            logo: {
              href: "https://example.com/logo.png",
              title: "Brand logo",
            },
          }}
          text="Logo ![logo]"
        />,
      host
    );
    mountedRoots.push(dispose);

    const image = host.querySelector("img");
    expect(image?.getAttribute("src")).toBe("https://example.com/logo.png");
    expect(image?.getAttribute("alt")).toBe("logo");
    expect(image?.getAttribute("title")).toBe("Brand logo");
  });

  it("renders unresolved shortcut references as plain text", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(() => <RenderInline text="Open [docs]" />, host);
    mountedRoots.push(dispose);

    expect(host.querySelector("a")).toBeNull();
    expect(host.textContent).toBe("Open [docs]");
  });

  it("renders footnote references as superscript backlinks", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(() => <RenderInline text="Alpha[^1]" />, host);
    mountedRoots.push(dispose);

    const footnoteRef = host.querySelector("sup a");
    expect(footnoteRef?.getAttribute("href")).toBe("#fn-1");
    expect(footnoteRef?.getAttribute("id")).toBe("fnref-1");
    expect(footnoteRef?.textContent).toBe("[1]");
  });

  it("renders inline math with a semantic fallback shell", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () => <RenderInline text="Energy is $E = mc^2$ today" />,
      host
    );
    mountedRoots.push(dispose);

    const inlineMath = host.querySelector('[data-velomark-inline-math]');
    expect(inlineMath).not.toBeNull();
    expect(inlineMath?.querySelector("code")?.textContent).toBe("E = mc^2");
  });

  it("renders raw inline html as a source shell by default", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () => <RenderInline text="Text with <span>hi</span> here" />,
      host
    );
    mountedRoots.push(dispose);

    const inlineHtml = host.querySelector('[data-velomark-inline-html]');
    expect(inlineHtml).not.toBeNull();
    expect(inlineHtml?.textContent).toBe("<span>hi</span>");
    expect(host.querySelector("span > span")).toBeNull();
  });

  it("renders hard line break tokens as br elements", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(() => <RenderInline text={"Alpha  \nBeta"} />, host);
    mountedRoots.push(dispose);

    const br = host.querySelector("br");
    expect(br).not.toBeNull();
    expect(host.textContent).toBe("AlphaBeta");
  });
});
