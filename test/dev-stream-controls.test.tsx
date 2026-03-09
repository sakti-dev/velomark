import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../dev/App";

describe("playground stream controls", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("streams renderer content progressively when simulate stream is clicked", async () => {
    vi.useFakeTimers();

    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;

    textarea.value = "# Demo\n\nAlpha Beta Gamma Delta";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    const simulateButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Simulate stream")
    ) as HTMLButtonElement;
    expect(simulateButton).toBeTruthy();

    simulateButton.click();

    await vi.advanceTimersByTimeAsync(1);
    expect(container.textContent).toContain("Demo");
    expect(container.textContent).not.toContain("Gamma Delta");

    await vi.advanceTimersByTimeAsync(1_000);
    expect(container.textContent).toContain("Gamma Delta");

    dispose();
    container.remove();
  });
});
