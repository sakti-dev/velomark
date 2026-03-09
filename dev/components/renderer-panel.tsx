import type { Component } from "solid-js";
import { Velomark } from "../../src";

export interface RendererPanelProps {
  markdown: string;
}

export const RendererPanel: Component<RendererPanelProps> = (props) => {
  return (
    <section class="renderer-panel">
      <header class="panel-header">
        <h2>Renderer Viewport</h2>
        <p>Rendered output updates here as presets and stream controls change.</p>
      </header>
      <div class="renderer-surface">
        <Velomark markdown={props.markdown} />
      </div>
    </section>
  );
};
