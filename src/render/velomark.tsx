import { For, createEffect, createMemo, createSignal, type Component } from "solid-js";
import { buildRenderDocument, collectRenderMetrics } from "../model/render-document";
import type { ParsedBlockData } from "../parser/block-boundaries";
import { generateCssVars } from "../theme/generate-css-vars";
import type { PartialVelomarkTheme } from "../theme/merge-theme";
import { resolveTheme } from "../theme/apply-theme";
import type { VelomarkThemeName } from "../theme/types";
import type {
  VelomarkCodeBlockOptions,
  RenderDocument,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
  VelomarkDebugMetrics,
} from "../types";
import { RenderBlockView } from "./render-block";
import { FootnotesSection } from "./footnotes/footnotes-section";

export interface VelomarkProps {
  class?: string;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<
    string,
    Component<VelomarkCodeBlockRendererProps>
  >;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  markdown: string;
  onDebugMetrics?: (metrics: VelomarkDebugMetrics) => void;
  theme?: VelomarkThemeName | PartialVelomarkTheme;
}

const BlockSlot: Component<{
  blockId: string;
  blockLookup: () => Map<string, RenderDocument<ParsedBlockData>["blocks"][number]>;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<
    string,
    Component<VelomarkCodeBlockRendererProps>
  >;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  definitions: () => RenderDocument<ParsedBlockData>["definitions"];
  index: () => number;
}> = (props) => {
  const block = createMemo(() => {
    const resolvedBlock = props.blockLookup().get(props.blockId);
    if (!resolvedBlock) {
      throw new Error(`Missing block for id ${props.blockId}`);
    }

    return resolvedBlock;
  });

  return (
    <RenderBlockView
      block={block()}
      codeBlockOptions={props.codeBlockOptions}
      codeBlockRenderers={props.codeBlockRenderers}
      containers={props.containers}
      debug={props.debug}
      definitions={props.definitions()}
      index={props.index()}
    />
  );
};

export function Velomark(props: VelomarkProps) {
  const [document, setDocument] = createSignal<RenderDocument<ParsedBlockData>>(
    buildRenderDocument(undefined, props.markdown)
  );
  const themeStyle = createMemo<Record<string, string>>(() =>
    generateCssVars(resolveTheme(props.theme))
  );
  const blockIds = createMemo(() => document().blocks.map((block) => block.id));
  const blockLookup = createMemo(
    () => new Map(document().blocks.map((block) => [block.id, block] as const))
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
      style={themeStyle()}
    >
      <For each={blockIds()}>
        {(blockId, index) => (
          <BlockSlot
            blockId={blockId}
            blockLookup={blockLookup}
            codeBlockOptions={props.codeBlockOptions}
            codeBlockRenderers={props.codeBlockRenderers}
            containers={props.containers}
            debug={props.debug}
            definitions={() => document().definitions}
            index={index}
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
