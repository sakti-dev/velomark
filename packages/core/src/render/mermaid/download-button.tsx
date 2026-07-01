import { type Component, createEffect, createSignal, onCleanup, Show } from "solid-js";
import { cn } from "cnfast";

import { DownloadIcon } from "../icons";
import type { DiagramPlugin } from "../../plugins/types";
import { save, svgToPngBlob } from "./utils";

let mermaidDownloadSequence = 0;

const nextDownloadId = (): string => {
  mermaidDownloadSequence += 1;
  return `velomark-mermaid-download-${mermaidDownloadSequence}`;
};

export interface MermaidDownloadDropdownProps {
  chart: string;
  class?: string;
  plugin: DiagramPlugin;
}

type MermaidFormat = "mmd" | "png" | "svg";

export const MermaidDownloadDropdown: Component<MermaidDownloadDropdownProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;

  const downloadMermaid = async (format: MermaidFormat) => {
    try {
      if (format === "mmd") {
        save("diagram.mmd", props.chart, "text/plain");
        setIsOpen(false);
        return;
      }

      const mermaid = props.plugin.getMermaid();
      const { svg } = await mermaid.render(nextDownloadId(), props.chart);

      if (!svg) {
        return;
      }

      if (format === "svg") {
        save("diagram.svg", svg, "image/svg+xml");
        setIsOpen(false);
        return;
      }

      const blob = await svgToPngBlob(svg);
      save("diagram.png", blob, "image/png");
      setIsOpen(false);
    } catch {
      // Silently ignore download errors.
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    const path = event.composedPath();
    if (containerRef && !path.includes(containerRef)) {
      setIsOpen(false);
    }
  };

  const documentMount = () => {
    document.addEventListener("mousedown", handleClickOutside);
  };

  const documentCleanup = () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };

  // Attach the outside-click listener while the dropdown is open.
  createEffect(() => {
    if (isOpen()) {
      documentMount();
      onCleanup(documentCleanup);
    }
  });

  return (
    <div
      ref={(el) => {
        containerRef = el;
      }}
      class={cn("relative")}
    >
      <button
        class={cn(
          "vm-mermaid-download cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
          props.class,
        )}
        title="Download diagram"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <DownloadIcon size={14} />
      </button>
      <Show when={isOpen()}>
        <div
          class={cn(
            "absolute top-full right-0 z-10 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg",
          )}
        >
          <button
            class="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"
            title="Download diagram as SVG"
            type="button"
            onClick={() => downloadMermaid("svg")}
          >
            SVG
          </button>
          <button
            class="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"
            title="Download diagram as PNG"
            type="button"
            onClick={() => downloadMermaid("png")}
          >
            PNG
          </button>
          <button
            class="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"
            title="Download diagram as MMD"
            type="button"
            onClick={() => downloadMermaid("mmd")}
          >
            MMD
          </button>
        </div>
      </Show>
    </div>
  );
};
