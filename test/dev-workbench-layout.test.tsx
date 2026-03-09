import { render } from "solid-js/web";
import { describe, expect, it } from "vitest";
import App from "../dev/App";

describe("playground workbench layout", () => {
  it("renders a compact diagnostics strip instead of separate diagnostic panels", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const dispose = render(() => <App />, container);

    expect(container.textContent).toContain("Diagnostics");
    expect(container.textContent).not.toContain("DOM Identity");
    expect(container.textContent).not.toContain("Selection Probe");
    expect(container.textContent).not.toContain("BenchmarkMeasure");
    expect(
      container.querySelector('.renderer-surface .markdown-content[data-component="markdown"]')
    ).not.toBeNull();

    dispose();
    container.remove();
  });
});
