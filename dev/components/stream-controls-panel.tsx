import type { Component } from "solid-js";
import type { PlaygroundStreamControls, PlaygroundStreamMode } from "../types/playground";

export interface StreamControlsPanelProps {
  controls: PlaygroundStreamControls;
  isStreaming: boolean;
  onControlsChange: (next: PlaygroundStreamControls) => void;
  onRenderOnce: () => void;
  onReset: () => void;
  onSimulateStream: () => void;
}

const STREAM_MODES: Array<{ label: string; value: PlaygroundStreamMode }> = [
  { label: "Append", value: "append" },
  { label: "Rewrite Tail", value: "rewrite-tail" },
];

export const StreamControlsPanel: Component<StreamControlsPanelProps> = (props) => {
  const updateControls = (patch: Partial<PlaygroundStreamControls>) => {
    props.onControlsChange({
      ...props.controls,
      ...patch,
    });
  };

  return (
    <section class="controls-panel">
      <header class="panel-header">
        <h2>Stream Controls</h2>
        <p>Replay the current markdown progressively to inspect update behavior.</p>
      </header>

      <div class="stream-control-grid">
        <label class="field-group">
          <span>Chunk Size</span>
          <input
            class="stream-field"
            min="1"
            onInput={(event) => {
              updateControls({
                chunkSize: Number(event.currentTarget.value) || 1,
              });
            }}
            type="number"
            value={props.controls.chunkSize}
          />
        </label>

        <label class="field-group">
          <span>Interval (ms)</span>
          <input
            class="stream-field"
            min="1"
            onInput={(event) => {
              updateControls({
                intervalMs: Number(event.currentTarget.value) || 1,
              });
            }}
            type="number"
            value={props.controls.intervalMs}
          />
        </label>

        <label class="field-group">
          <span>Mode</span>
          <select
            class="stream-field"
            onInput={(event) => {
              updateControls({
                mode: event.currentTarget.value as PlaygroundStreamMode,
              });
            }}
            value={props.controls.mode}
          >
            {STREAM_MODES.map((mode) => (
              <option value={mode.value}>{mode.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div class="control-actions">
        <button onClick={props.onRenderOnce} type="button">
          Render once
        </button>
        <button disabled={props.isStreaming} onClick={props.onSimulateStream} type="button">
          {props.isStreaming ? "Streaming..." : "Simulate stream"}
        </button>
        <button onClick={props.onReset} type="button">
          Reset
        </button>
      </div>
    </section>
  );
};
