import { For, type Component } from "solid-js";
import type { PlaygroundPreset } from "../types/playground";

export interface InputPanelProps {
  activePresetId: PlaygroundPreset["id"];
  markdown: string;
  presets: PlaygroundPreset[];
  onMarkdownChange: (value: string) => void;
  onPresetSelect: (preset: PlaygroundPreset) => void;
}

export const InputPanel: Component<InputPanelProps> = (props) => {
  return (
    <section class="controls-panel">
      <header class="panel-header">
        <h2>Input</h2>
        <p>Pick a preset or edit the markdown directly.</p>
      </header>

      <div class="preset-list">
        <For each={props.presets}>
          {(preset) => (
            <button
              class={
                preset.id === props.activePresetId
                  ? "preset-button preset-button-active"
                  : "preset-button"
              }
              onClick={() => props.onPresetSelect(preset)}
              type="button"
            >
              {preset.label}
            </button>
          )}
        </For>
      </div>

      <textarea
        class="markdown-input"
        onInput={(event) => props.onMarkdownChange(event.currentTarget.value)}
        rows="12"
        value={props.markdown}
      />
    </section>
  );
};
