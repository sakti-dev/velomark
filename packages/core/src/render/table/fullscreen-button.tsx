import {
  type Component,
  type JSX,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import { cn } from "cnfast";
import { lockBodyScroll, unlockBodyScroll } from "../../lib/scroll-lock";
import { useVelomark } from "../../lib/velomark-context";
import { TableCopyDropdown } from "./copy-dropdown";
import { TableDownloadDropdown } from "./download-dropdown";

export const TableFullscreenButton: Component<{
  children: JSX.Element;
  showCopy?: boolean;
  showDownload?: boolean;
  class?: string;
}> = (props) => {
  const vm = useVelomark();
  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const showCopy = () => props.showCopy ?? true;
  const showDownload = () => props.showDownload ?? true;
  const handleClose = () => setIsFullscreen(false);

  onMount(() => {
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", handleEsc);
    onCleanup(() => document.removeEventListener("keydown", handleEsc));
  });

  let prevFullscreen = false;
  createEffect(() => {
    const fs = isFullscreen();
    if (fs && !prevFullscreen) lockBodyScroll();
    if (!fs && prevFullscreen) unlockBodyScroll();
    prevFullscreen = fs;
  });
  onCleanup(() => {
    if (prevFullscreen) unlockBodyScroll();
  });

  return (
    <>
      <button
        class={cn(
          "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground",
          props.class,
        )}
        onClick={() => setIsFullscreen(true)}
        title={vm.t.viewFullscreen}
        type="button"
      >
        <vm.icons.Maximize2Icon size={14} />
      </button>
      <Show when={isFullscreen()}>
        <Portal mount={document.body}>
          <div
            class={cn("fixed inset-0 z-50 flex flex-col bg-background")}
            data-velomark="table-fullscreen"
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-label={vm.t.viewFullscreen}
          >
            <div
              class={cn("flex h-full flex-col")}
              onClick={(e) => e.stopPropagation()}
              role="presentation"
            >
              <div class={cn("flex items-center justify-end gap-1 p-4")}>
                <Show when={showCopy()}>
                  <TableCopyDropdown />
                </Show>
                <Show when={showDownload()}>
                  <TableDownloadDropdown />
                </Show>
                <button
                  class={cn(
                    "rounded-md p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
                  )}
                  onClick={handleClose}
                  title={vm.t.exitFullscreen}
                  type="button"
                >
                  <vm.icons.XIcon size={20} />
                </button>
              </div>
              <div
                class={cn(
                  "flex-1 overflow-auto p-4 pt-0 [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10",
                )}
              >
                <div data-velomark="table-wrapper">
                  <table
                    class={cn("w-full border-collapse border border-border")}
                    data-velomark="table"
                  >
                    {props.children}
                  </table>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
};
