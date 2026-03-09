import { createSignal, onCleanup, type Component } from "solid-js";
import { BenchmarkPanel } from "./components/benchmark-panel";
import { InputPanel } from "./components/input-panel";
import { PlaygroundShell } from "./components/playground-shell";
import { RendererPanel } from "./components/renderer-panel";
import { StreamControlsPanel } from "./components/stream-controls-panel";
import { playgroundPresets } from "./fixtures/presets";
import { usePlaygroundMetrics } from "./hooks/use-playground-metrics";
import { createStreamSimulator } from "./hooks/use-stream-simulator";
import type { PlaygroundPreset } from "./types/playground";

const initialPreset = playgroundPresets[0];
const DEFAULT_STREAM_CONTROLS = {
  chunkSize: 8,
  intervalMs: 40,
  mode: "append",
} as const;

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
  const { benchmarkState, runBenchmark } = usePlaygroundMetrics({
    chunkSize: () => streamControls().chunkSize,
    markdown,
  });
  let activeTimer: ReturnType<typeof setTimeout> | undefined;

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

  const handleMarkdownChange = (value: string) => {
    clearStreaming();
    setMarkdown(value);
    setRenderedMarkdown(value);
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
          <InputPanel
            activePresetId={activePresetId()}
            markdown={markdown()}
            onMarkdownChange={handleMarkdownChange}
            onPresetSelect={handlePresetSelect}
            presets={playgroundPresets}
          />

          <StreamControlsPanel
            controls={streamControls()}
            isStreaming={isStreaming()}
            onControlsChange={setStreamControls}
            onRenderOnce={handleRenderOnce}
            onReset={handleReset}
            onSimulateStream={handleSimulateStream}
          />

          <BenchmarkPanel benchmarkState={benchmarkState()} onRunBenchmark={runBenchmark} />
        </div>
      }
      renderer={<RendererPanel markdown={renderedMarkdown()} />}
    />
  );
};

export default App;
