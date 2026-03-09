import { For, Show, type Component } from "solid-js";
import type { SelectionProbeState } from "../hooks/use-selection-probe";
import type {
  PlaygroundBenchmarkState,
  PlaygroundPreset,
  PlaygroundStreamControls,
  PlaygroundStreamMode,
} from "../types/playground";

export interface WorkbenchControlsPanelProps {
  activePresetId: PlaygroundPreset["id"];
  benchmarkState: PlaygroundBenchmarkState;
  controls: PlaygroundStreamControls;
  isStreaming: boolean;
  onControlsChange: (next: PlaygroundStreamControls) => void;
  onPresetSelect: (preset: PlaygroundPreset) => void;
  onProbeSelection: () => void;
  onRenderOnce: () => void;
  onReset: () => void;
  onRunBenchmark: () => void;
  onSimulateStream: () => void;
  presets: PlaygroundPreset[];
  probeState: SelectionProbeState;
  selectionProbeEnabled: boolean;
}

const STREAM_MODES: Array<{ label: string; value: PlaygroundStreamMode }> = [
  { label: "Append", value: "append" },
  { label: "Rewrite Tail", value: "rewrite-tail" },
];

export const WorkbenchControlsPanel: Component<WorkbenchControlsPanelProps> = (props) => {
  const updateControls = (patch: Partial<PlaygroundStreamControls>) => {
    props.onControlsChange({
      ...props.controls,
      ...patch,
    });
  };

  return (
    <section class="controls-panel">
      <header class="panel-header">
        <h2>Workbench</h2>
        <p>Pick a replay preset, run the stream, and inspect compact diagnostics.</p>
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
            <For each={STREAM_MODES}>
              {(mode) => <option value={mode.value}>{mode.label}</option>}
            </For>
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
        <button
          disabled={!props.selectionProbeEnabled}
          onClick={props.onProbeSelection}
          type="button"
        >
          Probe selection
        </button>
        <button disabled={props.benchmarkState.isRunning} onClick={props.onRunBenchmark} type="button">
          {props.benchmarkState.isRunning ? "Running benchmark..." : "Run benchmark"}
        </button>
      </div>

      <div class="workbench-summary">
        <span class="benchmark-status">
          {props.selectionProbeEnabled
            ? props.probeState.statusMessage
            : "Selection probe unavailable"}
        </span>
        <span class="benchmark-status">
          <Show
            fallback={`Completed ${props.benchmarkState.completedRuns} / ${props.benchmarkState.totalRuns}`}
            when={props.benchmarkState.isRunning}
          >
            {`Running ${props.benchmarkState.completedRuns + 1} / ${props.benchmarkState.totalRuns}`}
          </Show>
        </span>
      </div>
    </section>
  );
};
