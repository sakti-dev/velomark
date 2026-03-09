import { render } from "solid-js/web";
import { describe, expect, it } from "vitest";
import App from "../dev/App";

describe("playground selection probe", () => {
  it("reports that the captured anchor survives append updates", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);
    const recordedReplayButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Recorded Replay")
    ) as HTMLButtonElement;

    recordedReplayButton.click();

    const firstBlock = container.querySelector(
      '[data-velomark-block-kind="paragraph"]'
    ) as HTMLParagraphElement;
    const textNode = firstBlock.firstChild;
    expect(textNode).toBeTruthy();

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(textNode as Text, 0);
    range.setEnd(textNode as Text, 5);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const probeButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Probe selection")
    ) as HTMLButtonElement;

    expect(probeButton).toBeTruthy();
    probeButton.click();

    expect(container.textContent).toContain("Selection stable");
    expect(container.textContent).toContain("Selection Stable");
    expect(container.textContent).toContain("Yes");

    const agentReplayButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Agent Replay")
    ) as HTMLButtonElement;

    agentReplayButton.click();

    expect(container.textContent).toContain("Selection stable");
    expect(container.textContent).toContain("Yes");

    dispose();
    container.remove();
  });
});
