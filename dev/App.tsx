import type { Component } from "solid-js";
import { playgroundPresets } from "./fixtures/presets";
import { PlaygroundShell } from "./components/playground-shell";
import { RendererPanel } from "./components/renderer-panel";

const App: Component = () => {
  const initialPreset = playgroundPresets[0];
  const markdown = initialPreset?.markdown ?? "# Velomark Playground";

  return (
    <PlaygroundShell
      controls={
        <section class="controls-panel">
          <header class="panel-header">
            <h2>Stream Controls</h2>
            <p>Basic shell controls. Streaming behavior gets wired in later tasks.</p>
          </header>
          <div class="control-actions">
            <button type="button">Render once</button>
            <button type="button">Simulate stream</button>
            <button type="button">Reset</button>
          </div>
        </section>
      }
      renderer={<RendererPanel markdown={markdown} />}
    />
  );
};

export default App;
