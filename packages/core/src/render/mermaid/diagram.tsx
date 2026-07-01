import { type Component, createEffect, createSignal, onCleanup, Switch, Match } from "solid-js";
import { cn } from "cnfast";
import { isServer } from "solid-js/web";

import type { DiagramPlugin } from "../../lib/plugin-types";
import { PanZoom } from "./pan-zoom";

const generateChartId = (chart: string): string => {
  let hash = 0;
  for (let i = 0; i < chart.length; i++) {
    hash = ((hash << 5) - hash + chart.charCodeAt(i)) | 0;
  }
  return `mermaid-${Math.abs(hash)}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

export interface MermaidDiagramProps {
  chart: string;
  class?: string;
  fullscreen?: boolean;
  isIncomplete?: boolean;
  plugin: DiagramPlugin;
  showControls?: boolean;
}

export const MermaidDiagram: Component<MermaidDiagramProps> = (props) => {
  const [svg, setSvg] = createSignal("");
  const [lastValidSvg, setLastValidSvg] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [retryCount, setRetryCount] = createSignal(0);
  let activeRenderToken = 0;

  createEffect(() => {
    const source = props.chart;
    void retryCount();

    if (isServer || source.length === 0) {
      setSvg("");
      setError(null);
      setIsLoading(false);
      return;
    }

    if (props.isIncomplete && lastValidSvg().length === 0) {
      setIsLoading(false);
      return;
    }

    const renderToken = (activeRenderToken += 1);
    setIsLoading(true);

    props.plugin
      .getMermaid()
      .render(generateChartId(source), source)
      .then(({ svg: rendered }) => {
        if (activeRenderToken !== renderToken) {
          return;
        }
        setSvg(rendered);
        setLastValidSvg(rendered);
        setError(null);
      })
      .catch((err: unknown) => {
        if (activeRenderToken !== renderToken) {
          return;
        }
        if (!(lastValidSvg() || svg())) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to render Mermaid chart";
          setError(errorMessage);
        }
      })
      .finally(() => {
        if (activeRenderToken === renderToken) {
          setIsLoading(false);
        }
      });
  });

  onCleanup(() => {
    activeRenderToken += 1;
  });

  const displaySvg = () => svg() || lastValidSvg();
  const retry = () => setRetryCount((c) => c + 1);

  return (
    <Switch
      fallback={
        <pre class={cn("vm-mermaid-source overflow-x-auto p-4 font-mono text-xs text-sm")}>
          <code>{props.chart}</code>
        </pre>
      }
    >
      <Match when={displaySvg().length > 0}>
        <div class={cn("size-full", props.class)} data-velomark="mermaid">
          <PanZoom
            class={cn(
              props.fullscreen ? "size-full overflow-hidden" : "overflow-hidden",
              props.class,
            )}
            fullscreen={props.fullscreen}
            showControls={props.showControls}
          >
            <div
              aria-label="Mermaid chart"
              class={cn(
                "vm-mermaid-diagram flex justify-center",
                props.fullscreen && "size-full items-center",
              )}
              innerHTML={displaySvg()}
              role="img"
            />
          </PanZoom>
        </div>
      </Match>
      <Match when={isLoading()}>
        <div class={cn("my-4 flex justify-center p-4", props.class)}>
          <div class={cn("flex items-center space-x-2 text-muted-foreground")}>
            <div class={cn("h-4 w-4 animate-spin rounded-full border-current border-b-2")} />
            <span class={cn("text-sm")}>Loading diagram...</span>
          </div>
        </div>
      </Match>
      <Match when={error()}>
        <div class={cn("rounded-md bg-red-50 p-4", props.class)}>
          <p class={cn("font-mono text-red-700 text-sm")}>Mermaid Error: {error()}</p>
          <button class={cn("text-red-600 text-xs")} onClick={retry}>
            Retry
          </button>
          <details class={cn("mt-2")}>
            <summary class={cn("text-red-600 text-xs")}>Show Code</summary>
            <pre class={cn("mt-2 overflow-x-auto rounded bg-red-100 p-2 text-red-800 text-xs")}>
              {props.chart}
            </pre>
          </details>
        </div>
      </Match>
    </Switch>
  );
};
