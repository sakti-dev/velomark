import { type Component, Show } from "solid-js";
import { cn } from "cnfast";

import type { CodeBlockData } from "../../lib/parser/block-boundaries";
import type { DiagramPlugin } from "../../lib/plugin-types";
import type { RenderBlock } from "../../types";
import { useVelomark } from "../../lib/velomark-context";
import { CodeBlockCopyButton } from "../code-block/copy-button";
import { MermaidDiagram } from "./diagram";
import { MermaidDownloadDropdown } from "./download-button";
import { MermaidFullscreenButton } from "./fullscreen-button";

export interface MermaidPluginViewProps {
  block: RenderBlock<CodeBlockData>;
  debug?: boolean;
  index: number;
  plugin: DiagramPlugin;
}

/**
 * Streamdown-aligned mermaid block: a `bg-sidebar` container holding a
 * "mermaid" header, a sticky top-right actions pill (download / copy /
 * fullscreen), and a `bg-background` diagram surface with pan-zoom.
 */
export const MermaidPluginView: Component<MermaidPluginViewProps> = (props) => {
  const vm = useVelomark();
  const code = () => props.block.data.code;
  const isIncomplete = () => props.block.status === "streaming";
  const showDownload = () => vm.controls?.mermaid?.download ?? true;
  const showFullscreen = () => vm.controls?.mermaid?.fullscreen ?? true;
  const showPanZoom = () => vm.controls?.mermaid?.panZoom ?? true;

  return (
    <div
      class={cn(
        "vm-mermaid group relative my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2",
      )}
      data-velomark-block-id={props.debug ? props.block.id : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
      data-velomark-incomplete={isIncomplete() ? "" : undefined}
    >
      <div class={cn("flex h-8 items-center text-muted-foreground text-xs")}>
        <span class={cn("ml-1 font-mono lowercase")}>mermaid</span>
      </div>
      <div
        class={cn(
          "vm-mermaid-actions pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end",
        )}
      >
        <div
          class={cn(
            "pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur",
          )}
        >
          <Show when={showDownload()}>
            <MermaidDownloadDropdown chart={code()} plugin={props.plugin} />
          </Show>
          <CodeBlockCopyButton code={code()} />
          <Show when={showFullscreen()}>
            <MermaidFullscreenButton
              chart={code()}
              plugin={props.plugin}
              showPanZoom={showPanZoom()}
            />
          </Show>
        </div>
      </div>
      <div class={cn("rounded-md border border-border bg-background")}>
        <MermaidDiagram
          chart={code()}
          isIncomplete={isIncomplete()}
          plugin={props.plugin}
          showControls
        />
      </div>
    </div>
  );
};
