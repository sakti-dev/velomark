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
});
