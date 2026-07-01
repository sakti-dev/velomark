import { type Component, type ComponentProps, For, Show, splitProps } from "solid-js";
import { cn } from "cnfast";

type CodeBlockBodyProps = ComponentProps<"div"> & {
  code: string;
  language?: string;
  lineNumbers?: boolean;
  startLine?: number;
};

/**
 * Renders raw (un-highlighted) code inside the streamdown-aligned body shell.
 * Used as the fallback when no `CodeHighlighterPlugin` is registered.
 */
export const CodeBlockBody: Component<CodeBlockBodyProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "code",
    "language",
    "lineNumbers",
    "startLine",
    "class",
    "children",
  ]);

  const lines = () => local.code.split("\n");

  return (
    <div
      {...rest}
      class={cn(
        "vm-code-body overflow-x-auto rounded-md border border-border bg-background p-4 text-sm",
        local.class,
      )}
      data-language={local.language}
    >
      <pre>
        <code
          class={local.lineNumbers ? "vm-line-numbers" : undefined}
          style={
            local.lineNumbers && local.startLine && local.startLine > 1
              ? { "counter-reset": `line ${local.startLine - 1}` }
              : undefined
          }
        >
          <Show when={local.lineNumbers} fallback={local.code}>
            <For each={lines()}>
              {(line, lineIndex) => (
                <>
                  <span class="vm-line">{line}</span>
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
