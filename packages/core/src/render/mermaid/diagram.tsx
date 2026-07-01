import { type Component, createEffect, createSignal, onCleanup, Show } from "solid-js";
import { cn } from "cnfast";
import { isServer } from "solid-js/web";

import type { DiagramPlugin } from "../../plugins/types";
import { PanZoom } from "./pan-zoom";

let mermaidChartSequence = 0;

const nextChartId = (): string => {
  mermaidChartSequence += 1;
  return `velomark-mermaid-${mermaidChartSequence}`;
};

export interface MermaidDiagramProps {
  chart: string;
  class?: string;
  fullscreen?: boolean;
  /** Still streaming — skip rendering and show the source fallback. */
  isIncomplete?: boolean;
  plugin: DiagramPlugin;
  showControls?: boolean;
}

/**
 * Renders a mermaid chart via a `DiagramPlugin` and wraps it in a PanZoom.
 * Falls back to the raw source while incomplete or when rendering fails.
 * Used both inline (mermaid block) and inside the fullscreen portal.
 */
export const MermaidDiagram: Component<MermaidDiagramProps> = (props) => {
  const [svg, setSvg] = createSignal("");
  let activeRenderToken = 0;

  createEffect(() => {
    const source = props.chart;

    if (isServer || source.length === 0 || props.isIncomplete) {
      setSvg("");
      return;
    }

    const renderToken = (activeRenderToken += 1);

    props.plugin
      .getMermaid()
      .render(nextChartId(), source)
      .then(({ svg: rendered }) => {
        if (activeRenderToken !== renderToken) {
          return;
        }
        setSvg(rendered);
      })
      .catch(() => {
        if (activeRenderToken !== renderToken) {
          return;
        }
        setSvg("");
      });
  });

  onCleanup(() => {
    activeRenderToken += 1;
  });

  return (
    <Show
      fallback={
        <pre class={cn("vm-mermaid-source overflow-x-auto p-4 font-mono text-xs text-sm")}>
          <code>{props.chart}</code>
        </pre>
      }
      when={svg().length > 0}
    >
      <PanZoom class={props.class} fullscreen={props.fullscreen} showControls={props.showControls}>
        <div
          aria-label="Mermaid chart"
          class={cn(
            "vm-mermaid-diagram flex justify-center",
            props.fullscreen && "size-full items-center",
          )}
          innerHTML={svg()}
          role="img"
        />
      </PanZoom>
    </Show>
  );
};
