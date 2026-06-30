import { type Component, createMemo, Show } from "solid-js";

import { usePlugins } from "../../plugins/plugin-context";

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
      <pre data-velomark-math-fallback="">
        <code>{props.formula}</code>
      </pre>
    ) : (
      <code data-velomark-math-fallback="">{props.formula}</code>
    );

  return (
    <Show when={result()?.html} fallback={fallback()}>
      <span data-velomark-math-rendered="" innerHTML={result()?.html} />
    </Show>
  );
};
