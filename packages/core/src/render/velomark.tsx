import { type Component, createEffect, For, Show, createMemo, type JSX } from "solid-js";
import { cn } from "cnfast";
import type { RemendOptions } from "remend";
import { BlockProvider } from "../lib/block-context";
import { VelomarkProvider, useVelomark } from "../lib/velomark-context";
import type {
  AnimateOptions,
  VelomarkCaret,
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
  caret?: VelomarkCaret;
  children?: JSX.Element;
  class?: string;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  dir?: "auto" | "ltr" | "rtl";
  lineNumbers?: boolean;
  markdown: string;
  onDebugMetrics?: (metrics: VelomarkDebugMetrics) => void;
  plugins?: PluginConfig;
  remend?: RemendOptions;
}

const CARET_CHARS: Record<VelomarkCaret, string> = {
  block: " ▋",
  circle: " ●",
};

function VelomarkView(props: { class?: string }) {
  const vm = useVelomark();

  let rootRef: HTMLDivElement | undefined; // eslint-disable-line no-unassigned-vars -- assigned by Solid ref

  const isStreaming = createMemo(() => vm.document.blocks.some((b) => b.status === "streaming"));

  const hideCaret = createMemo(() => {
    const blocks = vm.document.blocks;
    if (!isStreaming() || blocks.length === 0) return false;
    const last = blocks[blocks.length - 1];
    if (!last) return false;
    return last.status === "streaming" && (last.kind === "code" || last.kind === "table");
  });

  const showCaret = createMemo(() => vm.caret && isStreaming() && !hideCaret());

  const caretStyle = createMemo((): Record<string, string> | undefined => {
    const caret = vm.caret;
    if (!showCaret() || !caret) return undefined;
    const quoted = `"${CARET_CHARS[caret]}"`;
    return { "--velomark-caret": quoted };
  });

  createEffect(() => {
    const blocks = vm.document.blocks;
    void blocks[blocks.length - 1]?.fingerprint;
    const showing = showCaret();

    const root = rootRef;
    if (!root) return;

    root.querySelectorAll("[data-velomark-caret]").forEach((el) => {
      el.removeAttribute("data-velomark-caret");
    });

    if (!showing) return;

    const blockEls = root.querySelectorAll(":scope > [data-velomark-block-kind]");
    let target: Element | null =
      blockEls.length > 0 ? blockEls[blockEls.length - 1]! : root.lastElementChild;
    if (!target) return;

    while (target!.lastElementChild) {
      target = target!.lastElementChild;
    }

    target!.setAttribute("data-velomark-caret", "");
  });

  return (
    <div
      ref={rootRef}
      class={cn(
        "velomark space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        props.class,
      )}
      data-velomark-root=""
      dir={vm.dir}
      style={caretStyle()}
    >
      <For each={vm.blockIds}>
        {(blockId, index) => (
          <BlockProvider blockId={blockId} index={index()}>
            <RenderBlockView />
          </BlockProvider>
        )}
      </For>
      <Show when={vm.document.blocks.length === 0 && showCaret()}>
        <span />
      </Show>
      <FootnotesSection />
    </div>
  );
}

export function Velomark(props: VelomarkProps) {
  return (
    <VelomarkProvider {...props}>
      {props.children}
      <VelomarkView class={props.class} />
    </VelomarkProvider>
  );
}
