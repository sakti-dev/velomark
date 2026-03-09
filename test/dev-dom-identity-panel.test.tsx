import { render } from "solid-js/web";
import { describe, expect, it } from "vitest";
import App from "../dev/App";

describe("playground diagnostics strip", () => {
  it("shows live block metrics from renderer updates", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);
    const recordedReplayButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Recorded Replay")
    ) as HTMLButtonElement;

    recordedReplayButton.click();

    expect(container.textContent).toContain("Diagnostics");
    expect(container.textContent).toContain("Total Blocks");
    expect(container.textContent).toContain("18");
    expect(container.textContent).toContain("Reused");

    const codeHeavyButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Code Heavy")
    ) as HTMLButtonElement;

    codeHeavyButton.click();

    expect(container.textContent).toContain("5");
    expect(container.textContent).toContain("Replaced");
    expect(container.textContent).toContain("0");

    dispose();
    container.remove();
  });
});
