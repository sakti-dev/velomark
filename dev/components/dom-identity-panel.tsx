import { type Component } from "solid-js";
import type { VelomarkDebugMetrics } from "../../src/types";

export interface DomIdentityPanelProps {
  metrics: VelomarkDebugMetrics;
}

export const DomIdentityPanel: Component<DomIdentityPanelProps> = (props) => {
  return (
    <section class="controls-panel">
      <header class="panel-header">
        <h2>DOM Identity</h2>
        <p>Live renderer reuse metrics for the current markdown update path.</p>
      </header>

      <dl class="benchmark-metrics">
        <div>
          <dt>Total Blocks</dt>
          <dd>{props.metrics.blockCount}</dd>
        </div>
        <div>
          <dt>Reused Blocks</dt>
          <dd>{props.metrics.reusedBlockCount}</dd>
        </div>
        <div>
          <dt>Replaced Blocks</dt>
          <dd>{props.metrics.replacedBlockCount}</dd>
        </div>
        <div>
          <dt>Appended Blocks</dt>
          <dd>{props.metrics.appendedBlockCount}</dd>
        </div>
      </dl>
    </section>
  );
};
