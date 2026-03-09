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
    const codeHeavyButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Code Heavy")
    ) as HTMLButtonElement;

    codeHeavyButton.click();

    const simulateButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Simulate stream")
    ) as HTMLButtonElement;
    expect(simulateButton).toBeTruthy();

    simulateButton.click();

    await vi.advanceTimersByTimeAsync(1);
    expect(container.textContent).toContain("Stream");
    expect(container.textContent).not.toContain("Tail rewrites should only replace the affected suffix.");

    await vi.advanceTimersByTimeAsync(3_000);
    expect(container.textContent).toContain("Streamed Patch Example");
    expect(container.textContent).toContain("Tail rewrites should only replace the affected suffix.");

    dispose();
    container.remove();
  });
});
