import { createSignal, onCleanup, type Component } from "solid-js";
import { DiagnosticsStrip } from "./components/diagnostics-strip";
import { PlaygroundShell } from "./components/playground-shell";
import { RendererPanel } from "./components/renderer-panel";
import { WorkbenchControlsPanel } from "./components/workbench-controls-panel";
import { playgroundPresets } from "./fixtures/presets";
import { usePlaygroundMetrics } from "./hooks/use-playground-metrics";
import { useSelectionProbe } from "./hooks/use-selection-probe";
import { createStreamSimulator } from "./hooks/use-stream-simulator";
import type { PlaygroundPreset } from "./types/playground";
import type { VelomarkDebugMetrics } from "../src/types";

const initialPreset = playgroundPresets[0];
const DEFAULT_STREAM_CONTROLS = {
  chunkSize: 8,
  intervalMs: 40,
  mode: "append",
} as const;
const EMPTY_DEBUG_METRICS: VelomarkDebugMetrics = {
  appendedBlockCount: 0,
  blockCount: 0,
  replacedBlockCount: 0,
  reusedBlockCount: 0,
};

const App: Component = () => {
  const [activePresetId, setActivePresetId] = createSignal<PlaygroundPreset["id"]>(
    initialPreset?.id ?? "chat-response"
  );
  const [markdown, setMarkdown] = createSignal(
    initialPreset?.markdown ?? "# Velomark Playground"
  );
  const [renderedMarkdown, setRenderedMarkdown] = createSignal(markdown());
  const [isStreaming, setIsStreaming] = createSignal(false);
  const [streamControls, setStreamControls] = createSignal(DEFAULT_STREAM_CONTROLS);
  const [debugMetrics, setDebugMetrics] = createSignal(EMPTY_DEBUG_METRICS);
  const { benchmarkState, runBenchmark } = usePlaygroundMetrics({
    chunkSize: () => streamControls().chunkSize,
    markdown,
  });
  const { probeSelection, reevaluateSelection, selectionProbeState } = useSelectionProbe();
  let activeTimer: ReturnType<typeof setTimeout> | undefined;
  let rendererSurface: HTMLDivElement | undefined;

  const clearStreaming = () => {
    if (activeTimer !== undefined) {
      clearTimeout(activeTimer);
      activeTimer = undefined;
    }
    setIsStreaming(false);
  };

  const handlePresetSelect = (preset: PlaygroundPreset) => {
    clearStreaming();
    setActivePresetId(preset.id);
    setMarkdown(preset.markdown);
    setRenderedMarkdown(preset.markdown);
  };

  const handleRenderOnce = () => {
    clearStreaming();
    setRenderedMarkdown(markdown());
  };

  const handleReset = () => {
    clearStreaming();
    const preset = playgroundPresets.find((entry) => entry.id === activePresetId()) ?? initialPreset;
    const nextMarkdown = preset?.markdown ?? "# Velomark Playground";

    setMarkdown(nextMarkdown);
    setRenderedMarkdown(nextMarkdown);
  };

  const handleSimulateStream = () => {
    clearStreaming();

    const simulator = createStreamSimulator({
      chunkSize: streamControls().chunkSize,
      content: markdown(),
      mode: streamControls().mode,
    });
    const snapshots = simulator.snapshots;

    if (snapshots.length === 0) {
      setRenderedMarkdown("");
      return;
    }

    setRenderedMarkdown("");
    setIsStreaming(true);

    const pump = (index: number) => {
      const snapshot = snapshots[index];
      if (snapshot === undefined) {
        clearStreaming();
        return;
      }

      setRenderedMarkdown(snapshot);

      if (index >= snapshots.length - 1) {
        clearStreaming();
        return;
      }

      activeTimer = setTimeout(() => {
        pump(index + 1);
      }, streamControls().intervalMs);
    };

    activeTimer = setTimeout(() => {
      pump(0);
    }, 0);
  };

  onCleanup(() => {
    clearStreaming();
  });

  return (
    <PlaygroundShell
      controls={
        <div class="controls-column">
          <WorkbenchControlsPanel
            activePresetId={activePresetId()}
            benchmarkState={benchmarkState()}
            controls={streamControls()}
            isStreaming={isStreaming()}
            onControlsChange={setStreamControls}
            onPresetSelect={handlePresetSelect}
            onProbeSelection={probeSelection}
            onRenderOnce={handleRenderOnce}
            onReset={handleReset}
            onRunBenchmark={runBenchmark}
            onSimulateStream={handleSimulateStream}
            presets={playgroundPresets}
            probeState={selectionProbeState()}
          />
        </div>
      }
      renderer={
        <div class="renderer-column">
          <DiagnosticsStrip
            benchmarkState={benchmarkState()}
            metrics={debugMetrics()}
            probeState={selectionProbeState()}
          />
          <RendererPanel
            markdown={renderedMarkdown()}
            onDebugMetrics={(metrics) => {
              setDebugMetrics(metrics);
              reevaluateSelection(rendererSurface);
            }}
            onSurfaceReady={(element) => {
              rendererSurface = element;
            }}
          />
        </div>
      }
    />
  );
};

export default App;
