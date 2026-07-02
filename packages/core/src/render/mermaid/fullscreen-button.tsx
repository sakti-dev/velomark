import { type Component, createEffect, createSignal, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { cn } from "cnfast";

import { Maximize2Icon, XIcon } from "../icons";
import type { DiagramPlugin } from "../../lib/plugin-types";
import { MermaidDiagram } from "./diagram";
import { lockBodyScroll, unlockBodyScroll } from "./utils";

export interface MermaidFullscreenButtonProps {
  chart: string;
  class?: string;
  plugin: DiagramPlugin;
  showPanZoom?: boolean;
}

export const MermaidFullscreenButton: Component<MermaidFullscreenButtonProps> = (props) => {
  const [isFullscreen, setIsFullscreen] = createSignal(false);

  const toggle = () => setIsFullscreen((open) => !open);

  createEffect(() => {
    if (!isFullscreen()) {
      return;
    }

    lockBodyScroll();

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("keydown", handleEsc);

    onCleanup(() => {
      document.removeEventListener("keydown", handleEsc);
      unlockBodyScroll();
    });
  });

  return (
    <>
      <button
        class={cn(
          "vm-mermaid-fullscreen cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
          props.class,
        )}
        title="View fullscreen"
        type="button"
        onClick={toggle}
      >
        <Maximize2Icon size={14} />
      </button>
      <Show when={isFullscreen()}>
        <Portal mount={document.body}>
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
            onClick={toggle}
            tabIndex={0}
          >
            <button
              class="absolute top-4 right-4 z-10 rounded-md p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              title="Exit fullscreen"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsFullscreen(false);
              }}
            >
              <XIcon size={20} />
            </button>
            <div
              class="flex size-full items-center justify-center p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <MermaidDiagram
                chart={props.chart}
                class="size-full [&_svg]:h-auto [&_svg]:w-auto"
                fullscreen
                plugin={props.plugin}
                showControls={props.showPanZoom}
              />
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
};
