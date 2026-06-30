import { type Component, createEffect, createSignal, onCleanup, Show } from "solid-js";
import { isServer } from "solid-js/web";

import type { CodeBlockData } from "../../parser/block-boundaries";
import type { DiagramPlugin } from "../../plugins/types";
import type { RenderBlock } from "../../types";

let mermaidChartSequence = 0;

const nextChartId = (): string => {
  mermaidChartSequence += 1;
  return `velomark-mermaid-${mermaidChartSequence}`;
};

/**
 * Renders a mermaid code block via a `DiagramPlugin`. Core owns the wrapper +
 * fallback; the plugin supplies the SVG. Dormant until a mermaid plugin is
 * registered (Phase 4).
 */
export const MermaidPluginView: Component<{
  block: RenderBlock<CodeBlockData>;
  debug?: boolean;
  index: number;
  plugin: DiagramPlugin;
}> = (props) => {
  const [diagramSvg, setDiagramSvg] = createSignal<string>("");
  let activeRenderToken = 0;

  createEffect(() => {
    const source = props.block.data.code;
    const isComplete = props.block.status === "complete";

    if (isServer || source.length === 0 || !isComplete) {
      setDiagramSvg("");
      return;
    }

    const renderToken = activeRenderToken + 1;
    activeRenderToken = renderToken;

    props.plugin
      .getMermaid()
      .render(nextChartId(), source)
      .then(({ svg }) => {
        if (activeRenderToken !== renderToken) {
          return;
        }

        setDiagramSvg(svg);
      })
      .catch(() => {
        if (activeRenderToken !== renderToken) {
          return;
        }

        setDiagramSvg("");
      });
  });

  onCleanup(() => {
    activeRenderToken += 1;
  });

  return (
    <div
      data-velomark-block-id={props.debug ? props.block.id : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
      data-velomark-language="mermaid"
      data-velomark-mermaid=""
    >
      <Show
        fallback={
          <pre>
            <code>{props.block.data.code}</code>
          </pre>
        }
        when={diagramSvg().length > 0}
      >
        <div data-velomark-mermaid-diagram="" innerHTML={diagramSvg()} />
      </Show>
    </div>
  );
};
