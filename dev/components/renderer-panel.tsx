import type { Component } from "solid-js";
import { Velomark } from "../../src";
import type { VelomarkDebugMetrics } from "../../src/types";

export interface RendererPanelProps {
  markdown: string;
  onDebugMetrics?: (metrics: VelomarkDebugMetrics) => void;
  onSurfaceReady?: (element: HTMLDivElement) => void;
}

export const RendererPanel: Component<RendererPanelProps> = (props) => {
  return (
    <section class="renderer-panel">
      <header class="panel-header">
        <h2>Renderer Viewport</h2>
        <p>Rendered output updates here as presets and stream controls change.</p>
      </header>
      <div
        class="renderer-surface"
        ref={(element) => {
          props.onSurfaceReady?.(element);
        }}
      >
        <div class="markdown-content" data-component="markdown">
          <Velomark
            debug={false}
            markdown={props.markdown}
            onDebugMetrics={props.onDebugMetrics}
          />
        </div>
      </div>
    </section>
  );
};
