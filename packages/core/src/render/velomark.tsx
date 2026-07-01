import { type Component, For } from "solid-js";
import { cn } from "cnfast";
import { BlockProvider } from "../lib/block-context";
import { VelomarkProvider, useVelomark } from "../lib/velomark-context";
import type {
  AnimateOptions,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
  VelomarkDebugMetrics,
} from "../types";
import type { PluginConfig } from "../lib/plugin-types";
import { FootnotesSection } from "./compat/footnotes/footnotes-section";
import { RenderBlockView } from "./render-block";

export interface VelomarkProps {
  animated?: AnimateOptions | boolean;
  class?: string;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  markdown: string;
  onDebugMetrics?: (metrics: VelomarkDebugMetrics) => void;
  plugins?: PluginConfig;
}

function VelomarkView(props: { class?: string }) {
  const vm = useVelomark();
  return (
    <div
      class={cn(
        "velomark space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        props.class,
      )}
      data-velomark-root=""
    >
      <For each={vm.blockIds}>
        {(blockId, index) => (
          <BlockProvider blockId={blockId} index={index()}>
            <RenderBlockView />
          </BlockProvider>
        )}
      </For>
      <FootnotesSection />
    </div>
  );
}

export function Velomark(props: VelomarkProps) {
  return (
    <VelomarkProvider {...props}>
      <VelomarkView class={props.class} />
    </VelomarkProvider>
  );
}
