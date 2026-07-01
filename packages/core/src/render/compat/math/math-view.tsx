import { type Component, createMemo, Show } from "solid-js";
import { cn } from "cnfast";

import { useVelomark } from "../../../lib/velomark-context";

export const MathView: Component<{ displayMode: boolean; formula: string }> = (props) => {
  const vm = useVelomark();
  const result = createMemo(
    () => vm.plugins.math?.render(props.formula, props.displayMode) ?? null,
  );

  const fallback = () =>
    props.displayMode ? (
      <pre class={cn("vm-math mt-2 overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs")}>
        <code>{props.formula}</code>
      </pre>
    ) : (
      <code class={cn("vm-math rounded bg-muted px-1.5 py-0.5 font-mono text-sm")}>
        {props.formula}
      </code>
    );

  return (
    <Show when={result()?.html} fallback={fallback()}>
      <span
        class={cn("vm-math", props.displayMode ? "block overflow-x-auto" : "inline-flex")}
        innerHTML={result()?.html}
      />
    </Show>
  );
};
