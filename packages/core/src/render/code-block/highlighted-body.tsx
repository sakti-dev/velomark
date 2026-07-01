import { type Component, createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { cn } from "cnfast";

import type { CodeHighlighterPlugin, HighlightResult } from "../../lib/plugin-types";
import { buildTokenStyle, parseShikiStyle } from "./style-utils";

export interface HighlightedCodeBlockBodyProps {
  code: string;
  language?: string;
  lineNumbers?: boolean;
  plugin: CodeHighlighterPlugin;
  startLine?: number;
}

export const HighlightedCodeBlockBody: Component<HighlightedCodeBlockBodyProps> = (props) => {
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
    if (immediate) setResult(immediate);
  });

  const lines = () => result()?.tokens ?? [];

  const preStyle = createMemo(() => {
    const r = result();
    if (!r) return {};
    return {
      ...parseShikiStyle(r.bg, "--vm-bg"),
      ...parseShikiStyle(r.fg, "--vm-fg"),
      ...(typeof r.rootStyle === "string" ? parseShikiStyle(r.rootStyle, "--vm-bg") : {}),
    };
  });

  return (
    <div
      class={cn(
        "vm-code-body overflow-x-auto rounded-md border border-border bg-background p-4 text-sm",
      )}
      data-language={props.language}
    >
      <pre class="vm-code-pre" style={preStyle()}>
        <code
          class={cn(result() && "vm-code-highlighted", props.lineNumbers && "vm-line-numbers")}
          style={
            props.lineNumbers && props.startLine && props.startLine > 1
              ? { "counter-reset": `line ${props.startLine - 1}` }
              : undefined
          }
        >
          <Show fallback={props.code} when={result()}>
            <For each={lines()}>
              {(line, lineIndex) => (
                <>
                  <span class={cn(props.lineNumbers && "vm-line")}>
                    <For each={line}>
                      {(token) => (
                        <span class="vm-token" style={buildTokenStyle(token)}>
                          {token.content}
                        </span>
                      )}
                    </For>
                  </span>
                  <Show when={lineIndex() < lines().length - 1}>{"\n"}</Show>
                </>
              )}
            </For>
          </Show>
        </code>
      </pre>
    </div>
  );
};
