import { For, createEffect, createSignal, type Component } from "solid-js";
import { buildRenderDocument, collectRenderMetrics } from "../model/render-document";
import type { ParsedBlockData } from "../parser/block-boundaries";
import type {
  RenderDocument,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
  VelomarkDebugMetrics,
} from "../types";
import { RenderBlockView } from "./render-block";
import { FootnotesSection } from "./footnotes/footnotes-section";

export interface VelomarkProps {
  class?: string;
  codeBlockRenderers?: Record<
    string,
    Component<VelomarkCodeBlockRendererProps>
  >;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  markdown: string;
  onDebugMetrics?: (metrics: VelomarkDebugMetrics) => void;
}

export function Velomark(props: VelomarkProps) {
  const [document, setDocument] = createSignal<RenderDocument<ParsedBlockData>>(
    buildRenderDocument(undefined, props.markdown)
  );

  createEffect(() => {
    setDocument((previous) => {
      const nextDocument = buildRenderDocument(previous, props.markdown);

      props.onDebugMetrics?.(collectRenderMetrics(previous.blocks, nextDocument.blocks));

      return nextDocument;
    });
  });

  return (
    <div
      class={props.class ? `velomark ${props.class}` : "velomark"}
      data-velomark-root=""
    >
      <For each={document().blocks}>
        {(block, index) => (
          <RenderBlockView
            block={block}
            codeBlockRenderers={props.codeBlockRenderers}
            containers={props.containers}
            debug={props.debug}
            definitions={document().definitions}
            index={index()}
          />
        )}
      </For>
      <FootnotesSection
        codeBlockRenderers={props.codeBlockRenderers}
        containers={props.containers}
        definitions={document().definitions}
        footnoteDefinitions={document().footnoteDefinitions}
        order={document().footnoteReferenceOrder}
      />
    </div>
  );
}
