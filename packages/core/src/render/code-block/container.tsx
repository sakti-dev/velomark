import { type Component, type ComponentProps, splitProps } from "solid-js";
import { cn } from "cnfast";

type CodeBlockContainerProps = ComponentProps<"div"> & {
  language?: string;
  /** Whether the code block is still being streamed (incomplete) */
  isIncomplete?: boolean;
};

export const CodeBlockContainer: Component<CodeBlockContainerProps> = (props) => {
  const [local, rest] = splitProps(props, ["language", "isIncomplete", "class", "children"]);

  return (
    <div
      {...rest}
      class={cn(
        "vm-code-block my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2",
        local.class,
      )}
      data-incomplete={local.isIncomplete || undefined}
      data-language={local.language}
      style={{
        // Use content-visibility to skip rendering off-screen blocks
        "content-visibility": "auto",
        // Provide a hint for layout to prevent layout shifts
        "contain-intrinsic-size": "auto 200px",
      }}
    >
      {local.children}
    </div>
  );
};
