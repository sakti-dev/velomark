import { type Component, createMemo, Show } from "solid-js";
import { cn } from "cnfast";

import { usePlugins } from "../../lib/plugin-context";

/**
 * Renders math via a `MathRendererPlugin` (sync `render` → HTML string).
 * Falls back to the raw formula when no plugin is registered or the plugin
 * returns null (e.g. invalid TeX).
 */
export const MathView: Component<{ displayMode: boolean; formula: string }> = (props) => {
  const plugins = usePlugins();
  const result = createMemo(() => plugins.math?.render(props.formula, props.displayMode) ?? null);

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
