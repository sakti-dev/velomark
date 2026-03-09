import { For, createEffect, createSignal } from "solid-js";
import { buildRenderDocument } from "../model/render-document";
import type { ParagraphBlockData } from "../parser/block-boundaries";
import type { RenderDocument } from "../types";
import { RenderBlockView } from "./render-block";

export interface VelomarkProps {
  class?: string;
  markdown: string;
}

export function Velomark(props: VelomarkProps) {
  const [document, setDocument] = createSignal<RenderDocument<ParagraphBlockData>>(
    buildRenderDocument(undefined, props.markdown)
  );

  createEffect(() => {
    setDocument((previous) => buildRenderDocument(previous, props.markdown));
  });

  return (
    <div class={props.class} data-velomark-root="">
      <For each={document().blocks}>
        {(block, index) => <RenderBlockView block={block} index={index()} />}
      </For>
    </div>
  );
}
