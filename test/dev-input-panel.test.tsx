import { render } from "solid-js/web";
import { describe, expect, it } from "vitest";
import App from "../dev/App";

describe("playground preset controls", () => {
  it("switches presets and updates the renderer content", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);

    expect(container.textContent).toContain("Agent Replay Stress Sample");

    const codeHeavyButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Code Heavy")
    );
    expect(codeHeavyButton).toBeTruthy();

    (codeHeavyButton as HTMLButtonElement).click();

    expect(container.textContent).toContain("Streamed Patch Example");
    expect(container.textContent).not.toContain("Agent Replay Stress Sample");

    dispose();
    container.remove();
  });

  it("does not render the freeform markdown textarea anymore", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);

    expect(container.querySelector("textarea")).toBeNull();

    dispose();
    container.remove();
  });
});
