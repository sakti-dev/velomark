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

describe("streaming caret", () => {
  it("renders the caret root class and CSS var when streaming and caret is set", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () => <Velomark markdown="Streaming text without" caret="block" />,
      host,
    );
    mountedRoots.push(dispose);

    const root = host.querySelector("[data-velomark-root]") as HTMLElement;
    expect(root.classList.contains("vm-caret-root")).toBe(true);
    expect(root.style.getPropertyValue("--velomark-caret")).toContain("▋");
  });

  it("does not render the caret when not streaming", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () => <Velomark markdown={"Complete paragraph.\n"} caret="block" />,
      host,
    );
    mountedRoots.push(dispose);

    const root = host.querySelector("[data-velomark-root]") as HTMLElement;
    expect(root.classList.contains("vm-caret-root")).toBe(false);
  });

  it("hides the caret when the last streaming block is an unclosed code fence", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () => <Velomark markdown={["```ts", "const x = 1;"].join("\n")} caret="block" />,
      host,
    );
    mountedRoots.push(dispose);

    const root = host.querySelector("[data-velomark-root]") as HTMLElement;
    expect(root.classList.contains("vm-caret-root")).toBe(false);
  });

  it("supports the circle caret style", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(() => <Velomark markdown="Streaming text" caret="circle" />, host);
    mountedRoots.push(dispose);

    const root = host.querySelector("[data-velomark-root]") as HTMLElement;
    expect(root.style.getPropertyValue("--velomark-caret")).toContain("●");
  });
});
