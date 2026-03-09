import { type Component } from "solid-js";
import type { SelectionProbeState } from "../hooks/use-selection-probe";

export interface SelectionPanelProps {
  onProbeSelection: () => void;
  probeState: SelectionProbeState;
}

function formatBoolean(value: boolean): string {
  return value ? "Yes" : "No";
}

export const SelectionPanel: Component<SelectionPanelProps> = (props) => {
  return (
    <section class="controls-panel">
      <header class="panel-header">
        <h2>Selection Probe</h2>
        <p>Capture the current selection and verify whether its anchor survives later updates.</p>
      </header>

      <div class="benchmark-toolbar">
        <button onClick={props.onProbeSelection} type="button">
          Probe selection
        </button>
        <span class="benchmark-status">{props.probeState.statusMessage}</span>
      </div>

      <dl class="benchmark-metrics">
        <div>
          <dt>Anchor Block Replaced</dt>
          <dd>{formatBoolean(props.probeState.anchorBlockReplaced)}</dd>
        </div>
        <div>
          <dt>Anchor Node Connected</dt>
          <dd>{formatBoolean(props.probeState.anchorNodeConnected)}</dd>
        </div>
      </dl>
    </section>
  );
};
