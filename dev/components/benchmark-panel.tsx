import { For, Show, type Component } from "solid-js";
import type { PlaygroundBenchmarkState } from "../types/playground";

export interface BenchmarkPanelProps {
  benchmarkState: PlaygroundBenchmarkState;
  onRunBenchmark: () => void;
}

function formatModeLabel(mode: string): string {
  return mode === "rewrite-tail" ? "Rewrite Path" : "Append Path";
}

export const BenchmarkPanel: Component<BenchmarkPanelProps> = (props) => {
  return (
    <section class="controls-panel">
      <header class="panel-header">
        <h2>Benchmark</h2>
        <p>Measure document rebuild cost and block reuse across append and rewrite paths.</p>
      </header>

      <div class="benchmark-toolbar">
        <button disabled={props.benchmarkState.isRunning} onClick={props.onRunBenchmark} type="button">
          {props.benchmarkState.isRunning ? "Running benchmark..." : "Run benchmark"}
        </button>
        <span class="benchmark-status">
          <Show
            fallback={`Completed ${props.benchmarkState.completedRuns} / ${props.benchmarkState.totalRuns}`}
            when={props.benchmarkState.isRunning}
          >
            {`Running ${props.benchmarkState.completedRuns + 1} / ${props.benchmarkState.totalRuns}`}
          </Show>
        </span>
      </div>

      <div class="benchmark-results">
        <For each={props.benchmarkState.results}>
          {(result) => (
            <article class="benchmark-card">
              <h3>{formatModeLabel(result.mode)}</h3>
              <dl class="benchmark-metrics">
                <div>
                  <dt>Average Update</dt>
                  <dd>{result.averageUpdateMs.toFixed(2)} ms</dd>
                </div>
                <div>
                  <dt>Max Update</dt>
                  <dd>{result.maxUpdateMs.toFixed(2)} ms</dd>
                </div>
                <div>
                  <dt>Reused Blocks</dt>
                  <dd>{result.reusedBlockCount}</dd>
                </div>
                <div>
                  <dt>Replaced Blocks</dt>
                  <dd>{result.replacedBlockCount}</dd>
                </div>
                <div>
                  <dt>Appended Blocks</dt>
                  <dd>{result.appendedBlockCount}</dd>
                </div>
                <div>
                  <dt>Updates</dt>
                  <dd>{result.updates}</dd>
                </div>
              </dl>
            </article>
          )}
        </For>
      </div>
    </section>
  );
};
