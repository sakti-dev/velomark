import { type JSX, createContext, createEffect, useContext } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { buildRenderDocument, collectRenderMetrics } from "./model/render-document";
import { hasIncompleteCodeFence } from "./incomplete-code-utils";
import type { PluginConfig } from "./plugin-types";
import type { ParsedBlockData } from "./parser/block-boundaries";
import type {
  AnimateOptions,
  ReferenceDefinitionMap,
  RenderBlock,
  RenderDocument,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
  VelomarkDebugMetrics,
} from "../types";
import type { Component } from "solid-js";

export interface VelomarkStore {
  plugins: PluginConfig;
  animationConfig: AnimateOptions | null;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug: boolean;
  document: RenderDocument<ParsedBlockData>;
  blockIds: string[];
  definitions: ReferenceDefinitionMap;
  footnoteDefinitions: Record<string, RenderBlock<ParsedBlockData>[]>;
  footnoteReferenceOrder: string[];
  docHasIncomplete: boolean;
}

export interface VelomarkProviderProps {
  animated?: boolean | AnimateOptions;
  children: JSX.Element;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  debug?: boolean;
  markdown: string;
  onDebugMetrics?: (metrics: VelomarkDebugMetrics) => void;
  plugins?: PluginConfig;
}

const VelomarkContext = createContext<VelomarkStore>();

export function useVelomark(): VelomarkStore {
  const ctx = useContext(VelomarkContext);
  if (!ctx) throw new Error("useVelomark must be used within a VelomarkProvider");
  return ctx;
}

function resolveAnimationConfig(animated?: boolean | AnimateOptions): AnimateOptions | null {
  if (!animated) return null;
  if (animated === true) return {};
  return animated;
}

export function VelomarkProvider(props: VelomarkProviderProps) {
  const [document, setDocument] = createStore<RenderDocument<ParsedBlockData>>(
    buildRenderDocument(undefined, props.markdown),
  );

  createEffect(() => {
    const previous = unwrap(document);
    const next = buildRenderDocument(previous, props.markdown);
    props.onDebugMetrics?.(collectRenderMetrics(previous.blocks, next.blocks));
    setDocument(reconcile(next, { key: "id" }));
  });

  const store: VelomarkStore = {
    plugins: props.plugins ?? {},
    animationConfig: resolveAnimationConfig(props.animated),
    codeBlockOptions: props.codeBlockOptions,
    codeBlockRenderers: props.codeBlockRenderers,
    containers: props.containers,
    debug: props.debug ?? false,
    get document() {
      return document;
    },
    get blockIds() {
      return document.blocks.map((b) => b.id);
    },
    get definitions() {
      return document.definitions;
    },
    get footnoteDefinitions() {
      return document.footnoteDefinitions;
    },
    get footnoteReferenceOrder() {
      return document.footnoteReferenceOrder;
    },
    get docHasIncomplete() {
      return hasIncompleteCodeFence(props.markdown);
    },
  };

  return <VelomarkContext.Provider value={store}>{props.children}</VelomarkContext.Provider>;
}

export { VelomarkContext };
