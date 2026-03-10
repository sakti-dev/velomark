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
    <section class="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
      <header class="flex flex-col gap-1">
        <h2 class="text-lg font-semibold tracking-tight text-foreground">Diagnostics</h2>
        <p class="text-sm leading-6 text-muted-foreground">
          Compact reuse and stability signals while the renderer updates.
        </p>
      </header>

      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <For each={metrics()}>
          {(metric) => (
            <div class="rounded-lg border border-border bg-background p-3">
              <dt class="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {metric.label}
              </dt>
              <dd class="mt-1 text-sm font-semibold text-foreground">{metric.value}</dd>
            </div>
          )}
        </For>
      </div>
    </section>
  );
};
