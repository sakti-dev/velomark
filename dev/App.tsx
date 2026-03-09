import { createSignal, type Component } from "solid-js";
import { InputPanel } from "./components/input-panel";
import { PlaygroundShell } from "./components/playground-shell";
import { RendererPanel } from "./components/renderer-panel";
import { playgroundPresets } from "./fixtures/presets";
import type { PlaygroundPreset } from "./types/playground";

const initialPreset = playgroundPresets[0];

const App: Component = () => {
  const [activePresetId, setActivePresetId] = createSignal<PlaygroundPreset["id"]>(
    initialPreset?.id ?? "chat-response"
  );
  const [markdown, setMarkdown] = createSignal(
    initialPreset?.markdown ?? "# Velomark Playground"
  );

  const handlePresetSelect = (preset: PlaygroundPreset) => {
    setActivePresetId(preset.id);
    setMarkdown(preset.markdown);
  };

  return (
    <PlaygroundShell
      controls={
        <div class="controls-column">
          <InputPanel
            activePresetId={activePresetId()}
            markdown={markdown()}
            onMarkdownChange={setMarkdown}
            onPresetSelect={handlePresetSelect}
            presets={playgroundPresets}
          />

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
        </div>
      }
      renderer={<RendererPanel markdown={markdown()} />}
    />
  );
};

export default App;
