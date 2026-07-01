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
  it("places data-velomark-caret on deepest element and sets CSS var when streaming", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () => <Velomark markdown="Streaming text without" caret="block" />,
      host,
    );
    mountedRoots.push(dispose);

    const root = host.querySelector("[data-velomark-root]") as HTMLElement;
    expect(root.style.getPropertyValue("--velomark-caret")).toContain("▋");
    expect(host.querySelector("[data-velomark-caret]")).not.toBeNull();
  });

  it("does not render the caret when not streaming", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () => <Velomark markdown={"Complete paragraph.\n"} caret="block" />,
      host,
    );
    mountedRoots.push(dispose);

    expect(host.querySelector("[data-velomark-caret]")).toBeNull();
  });

  it("hides the caret when the last streaming block is an unclosed code fence", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () => <Velomark markdown={["```ts", "const x = 1;"].join("\n")} caret="block" />,
      host,
    );
    mountedRoots.push(dispose);

    expect(host.querySelector("[data-velomark-caret]")).toBeNull();
  });

  it("supports the circle caret style", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(() => <Velomark markdown="Streaming text" caret="circle" />, host);
    mountedRoots.push(dispose);

    const root = host.querySelector("[data-velomark-root]") as HTMLElement;
    expect(root.style.getPropertyValue("--velomark-caret")).toContain("●");
  });

  it("pins the caret inside the last <li> when streaming a list", () => {
    const host = document.createElement("div");
    document.body.append(host);

    const dispose = render(
      () => <Velomark markdown={"- first\n- second stream"} caret="block" />,
      host,
    );
    mountedRoots.push(dispose);

    const caretEl = host.querySelector("[data-velomark-caret]");
    expect(caretEl).not.toBeNull();
    expect(caretEl?.tagName).toBe("LI");
  });
});
