import { render } from "solid-js/web";
import { describe, expect, it } from "vitest";
import App from "../dev/App";

describe("playground dom identity panel", () => {
  it("shows live block metrics from renderer updates", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    textarea.value = "Alpha\n\nBeta";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    expect(container.textContent).toContain("DOM Identity");
    expect(container.textContent).toContain("Total Blocks");
    expect(container.textContent).toContain("2");

    textarea.value = "Alpha\n\nBeta\n\nGamma";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    expect(container.textContent).toContain("3");
    expect(container.textContent).toContain("Appended Blocks");
    expect(container.textContent).toContain("1");

    dispose();
    container.remove();
  });
});
