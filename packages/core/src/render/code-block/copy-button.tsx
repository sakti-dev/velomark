import { type Component, createSignal, onCleanup } from "solid-js";
import { cn } from "cnfast";

import { useVelomark } from "../../lib/velomark-context";
import { useCodeBlockContext } from "./context";

const COPY_RESET_DELAY_MS = 2000;

export interface CodeBlockCopyButtonProps {
  code?: string;
  class?: string;
}

export const CodeBlockCopyButton: Component<CodeBlockCopyButtonProps> = (props) => {
  const vm = useVelomark();
  const context = useCodeBlockContext();
  const [copied, setCopied] = createSignal<boolean>(false);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const copyToClipboard = async (): Promise<void> => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      return;
    }

    try {
      if (!copied()) {
        await navigator.clipboard.writeText(props.code ?? context.code);
        setCopied(true);
        timeoutId = setTimeout(() => {
          setCopied(false);
        }, COPY_RESET_DELAY_MS);
      }
    } catch {
      setCopied(false);
    }
  };

  onCleanup(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  });

  const label = () => (copied() ? vm.t.copied : vm.t.copyCode);

  return (
    <button
      aria-label={label()}
      class={cn(
        "vm-code-copy cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
        props.class,
      )}
      title={label()}
      type="button"
      onClick={() => copyToClipboard()}
    >
      {copied() ? <vm.icons.CheckIcon size={14} /> : <vm.icons.CopyIcon size={14} />}
    </button>
  );
};
