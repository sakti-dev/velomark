import { type Component, Show } from "solid-js";
import { cn } from "cnfast";

export interface CodeBlockHeaderProps {
  language?: string;
}

export const CodeBlockHeader: Component<CodeBlockHeaderProps> = (props) => {
  return (
    <div
      class={cn("vm-code-header flex h-8 items-center text-muted-foreground text-xs")}
      data-language={props.language}
    >
      <Show when={props.language}>
        <span class={cn("vm-code-language ml-1 font-mono lowercase")}>{props.language}</span>
      </Show>
    </div>
  );
};
