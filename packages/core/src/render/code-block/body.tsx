import { type Component, type ComponentProps, splitProps } from "solid-js";
import { cn } from "cnfast";

type CodeBlockBodyProps = ComponentProps<"div"> & {
  code: string;
  language?: string;
};

/**
 * Renders raw (un-highlighted) code inside the streamdown-aligned body shell.
 * Used as the fallback when no `CodeHighlighterPlugin` is registered.
 */
export const CodeBlockBody: Component<CodeBlockBodyProps> = (props) => {
  const [local, rest] = splitProps(props, ["code", "language", "class", "children"]);

  return (
    <div
      {...rest}
      class={cn(
        "overflow-x-auto rounded-md border border-border bg-background p-4 text-sm",
        local.class,
      )}
      data-language={local.language}
    >
      <pre>
        <code>{local.code}</code>
      </pre>
    </div>
  );
};
