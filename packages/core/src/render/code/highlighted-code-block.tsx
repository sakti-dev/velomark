import { type Component, createEffect, createSignal, For, Show } from "solid-js";
import { cn } from "cnfast";

import type { CodeHighlighterPlugin, HighlightResult, HighlightToken } from "../../plugins/types";

function buildTokenStyle(token: HighlightToken): Record<string, string> {
  const style: Record<string, string> = {};

  if (token.color) {
    style.color = token.color;
  }

  if (token.bgColor) {
    style["background-color"] = token.bgColor;
  }

  if (token.htmlStyle) {
    Object.assign(style, token.htmlStyle);
  }

  return style;
}

/**
 * Renders highlighted code tokens produced by a `CodeHighlighterPlugin`.
 * Core owns the token → DOM rendering; the plugin only supplies tokens.
 */
export const HighlightedCodeBlock: Component<{
  code: string;
  language?: string;
  plugin: CodeHighlighterPlugin;
}> = (props) => {
  const [result, setResult] = createSignal<HighlightResult | null>(null);

  createEffect(() => {
    const plugin = props.plugin;
    const immediate = plugin.highlight(
      {
        code: props.code,
        language: props.language?.trim() || "text",
        themes: plugin.getThemes(),
      },
      (next) => setResult(next),
    );

    if (immediate) {
      setResult(immediate);
    }
  });

  const lines = () => result()?.tokens ?? [];

  return (
    <pre class={cn("overflow-x-auto rounded-md border border-border bg-background p-4 text-sm")}>
      <code data-velomark-code-highlighted={result() ? "" : undefined}>
        <Show fallback={props.code} when={result()}>
          <For each={lines()}>
            {(line, lineIndex) => (
              <>
                <For each={line}>
                  {(token) => <span style={buildTokenStyle(token)}>{token.content}</span>}
                </For>
                <Show when={lineIndex() < lines().length - 1}>{"\n"}</Show>
              </>
            )}
          </For>
        </Show>
      </code>
    </pre>
  );
};
