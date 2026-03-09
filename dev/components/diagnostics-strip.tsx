import { For, type Component } from "solid-js";
import type { SelectionProbeState } from "../hooks/use-selection-probe";
import type { PlaygroundBenchmarkState } from "../types/playground";
import type { VelomarkDebugMetrics } from "../../src/types";

export interface DiagnosticsStripProps {
  benchmarkState: PlaygroundBenchmarkState;
  metrics: VelomarkDebugMetrics;
  probeState: SelectionProbeState;
}

function selectionLabel(probeState: SelectionProbeState): string {
  if (!probeState.hasSelection) {
    return "No";
  }
  return probeState.anchorNodeConnected && !probeState.anchorBlockReplaced ? "Yes" : "No";
}

export const DiagnosticsStrip: Component<DiagnosticsStripProps> = (props) => {
  const metrics = () => [
    { label: "Total Blocks", value: String(props.metrics.blockCount) },
    { label: "Reused", value: String(props.metrics.reusedBlockCount) },
    { label: "Replaced", value: String(props.metrics.replacedBlockCount) },
    { label: "Appended", value: String(props.metrics.appendedBlockCount) },
    { label: "Selection Stable", value: selectionLabel(props.probeState) },
    {
      label: "Benchmark",
      value:
        props.benchmarkState.results.length > 0
          ? `${props.benchmarkState.results.length} runs`
          : `${props.benchmarkState.completedRuns} / ${props.benchmarkState.totalRuns}`,
    },
  ];

  return (
    <section class="controls-panel diagnostics-strip">
      <header class="panel-header">
        <h2>Diagnostics</h2>
        <p>Compact reuse and stability signals while the renderer updates.</p>
      </header>

      <div class="diagnostics-grid">
        <For each={metrics()}>
          {(metric) => (
            <div class="diagnostic-pill">
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          )}
        </For>
      </div>
    </section>
  );
};
