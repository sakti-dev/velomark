import { type Component, createSignal, onCleanup, onMount, Show } from "solid-js";
import { cn } from "cnfast";
import { lockBodyScroll, unlockBodyScroll } from "../../lib/scroll-lock";
import { CheckIcon, CopyIcon, ExternalLinkIcon, XIcon } from "../icons";

const COPY_RESET_DELAY_MS = 2000;

export interface LinkSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  url: string;
}

export const LinkSafetyModal: Component<LinkSafetyModalProps> = (props) => {
  const [copied, setCopied] = createSignal(false);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(props.url);
      setCopied(true);
      timeoutId = setTimeout(() => setCopied(false), COPY_RESET_DELAY_MS);
    } catch {
      // Clipboard API not available
    }
  };

  const handleConfirm = (): void => {
    props.onConfirm();
    props.onClose();
  };

  onMount(() => {
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") props.onClose();
    };

    if (props.isOpen) {
      lockBodyScroll();
      document.addEventListener("keydown", handleEsc);
    }

    onCleanup(() => {
      if (props.isOpen) {
        document.removeEventListener("keydown", handleEsc);
        unlockBodyScroll();
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    });
  });

  return (
    <Show when={props.isOpen}>
      <div
        class={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm",
        )}
        data-velomark="link-safety-modal"
        onClick={() => props.onClose()}
        role="button"
        tabIndex={0}
      >
        <div
          class={cn(
            "relative mx-4 flex w-full max-w-md flex-col gap-4 rounded-xl border bg-background p-6 shadow-lg",
          )}
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          <button
            class={cn(
              "absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
            )}
            onClick={() => props.onClose()}
            title="Close"
            type="button"
          >
            <XIcon size={16} />
          </button>

          <div class={cn("flex flex-col gap-2")}>
            <div class={cn("flex items-center gap-2 font-semibold text-lg")}>
              <ExternalLinkIcon size={20} />
              <span>Open external link</span>
            </div>
            <p class={cn("text-muted-foreground text-sm")}>
              You are about to open an external link. Please verify the URL before continuing.
            </p>
          </div>

          <div
            class={cn(
              "break-all rounded-md bg-muted p-3 font-mono text-sm",
              props.url.length > 100 && "max-h-32 overflow-y-auto",
            )}
          >
            {props.url}
          </div>

          <div class={cn("flex gap-2")}>
            <button
              class={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 font-medium text-sm transition-all hover:bg-muted",
              )}
              onClick={handleCopy}
              type="button"
            >
              <Show
                when={copied()}
                fallback={
                  <>
                    <CopyIcon size={14} />
                    <span>Copy link</span>
                  </>
                }
              >
                <CheckIcon size={14} />
                <span>Copied</span>
              </Show>
            </button>
            <button
              class={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-all hover:bg-primary/90",
              )}
              onClick={handleConfirm}
              type="button"
            >
              <ExternalLinkIcon size={14} />
              <span>Open link</span>
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};
