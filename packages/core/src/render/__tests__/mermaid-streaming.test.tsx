import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { Velomark } from "../velomark";
import { mockMermaidPlugin } from "../../../test/mock-plugins";

const mountedRoots: Array<() => void> = [];

afterEach(() => {
  while (mountedRoots.length > 0) {
    mountedRoots.pop()?.();
  }
  document.body.innerHTML = "";
});

const svgPrototype = window.SVGElement.prototype as SVGElement & {
  getBBox?: () => DOMRect;
};

if (typeof svgPrototype.getBBox !== "function") {
  svgPrototype.getBBox = () =>
    ({ bottom: 24, height: 24, left: 0, right: 96, top: 0, width: 96, x: 0, y: 0 }) as DOMRect;
}

const waitFor = async (predicate: () => boolean, attempts = 100): Promise<void> => {
  for (let i = 0; i < attempts; i++) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
};

const diagramSources: Record<string, string> = {
  flowchart: "graph TD\nA-->B",
  sequence: "sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi",
  state: "stateDiagram-v2\n  [*] --> Active\n  Active --> [*]",
  journey: "journey\n  title Test\n  section A\n    Task1: 5: Me",
  gantt: "gantt\n  dateFormat YYYY-MM-DD\n  section S\n    Task: a1, 2024-01-01, 30d",
  pie: 'pie title Pets\n  "Dogs" : 386\n  "Cats" : 85',
};

describe("mermaid streaming simulation", () => {
  for (const [name, diagramSource] of Object.entries(diagramSources)) {
    it(`renders ${name} after fence closes during streaming`, async () => {
      const host = document.createElement("div");
      document.body.append(host);

      const fullMarkdown = "```mermaid\n" + diagramSource + "\n```";

      const [markdown, setMarkdown] = createSignal("");

      const dispose = render(
        () => <Velomark markdown={markdown()} plugins={{ mermaid: mockMermaidPlugin }} />,
        host,
      );
      mountedRoots.push(dispose);

      // Simulate streaming: add characters in chunks
      const chunkSize = Math.max(1, Math.floor(fullMarkdown.length / 10));
      for (let i = 0; i < fullMarkdown.length; i += chunkSize) {
        setMarkdown(fullMarkdown.slice(0, i + chunkSize));
        await new Promise((r) => setTimeout(r, 0));
      }
      setMarkdown(fullMarkdown);

      await waitFor(() => {
        const el = host.querySelector(".vm-mermaid-diagram");
        return Boolean(el?.querySelector("svg"));
      }, 200);

      const mermaidBlock = host.querySelector(".vm-mermaid");
      const diagram = mermaidBlock?.querySelector(".vm-mermaid-diagram");
      expect(diagram, `${name} diagram element should exist`).not.toBeNull();
      expect(diagram?.querySelector("svg"), `${name} should have SVG`).not.toBeNull();
    });
  }
});
