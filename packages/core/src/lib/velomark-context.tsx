import type { RemendOptions } from "remend";
import {
  type JSX,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  useContext,
} from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { buildRenderDocument, collectRenderMetrics } from "./model/render-document";
import { hasIncompleteCodeFence } from "./incomplete-code-utils";
import type { PluginConfig } from "./plugin-types";
import type { ParsedBlockData } from "./parser/block-boundaries";
import { resolveTranslations } from "./translations";
import type { VelomarkTranslations } from "./translations";
import type { IconMap } from "../render/icons";
import { resolveIcons } from "../render/icons";
import type {
  AnimateOptions,
  ControlsConfig,
  ReferenceDefinitionMap,
  RenderBlock,
  RenderDocument,
  VelomarkCaret,
  VelomarkCodeBlockOptions,
  VelomarkCodeBlockRendererProps,
  VelomarkContainerRendererProps,
  VelomarkDebugMetrics,
} from "../types";
import type { Component } from "solid-js";

export type AllowedTags = Record<string, string[]>;

export interface VelomarkStore {
  allowedTags?: AllowedTags;
  plugins: PluginConfig;
  animationConfig: AnimateOptions | null;
  caret?: VelomarkCaret;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  controls?: ControlsConfig;
  debug: boolean;
  dir?: "auto" | "ltr" | "rtl";
  document: RenderDocument<ParsedBlockData>;
  blockIds: string[];
  icons: IconMap;
  isStreaming: () => boolean;
  lineNumbers?: boolean;
  linkSafety?: boolean;
  linkSafetyUrl?: string | null;
  literalTagContent?: string[];
  openLinkSafety?: (url: string) => void;
  definitions: ReferenceDefinitionMap;
  footnoteDefinitions: Record<string, RenderBlock<ParsedBlockData>[]>;
  footnoteReferenceOrder: string[];
  docHasIncomplete: boolean;
  t: VelomarkTranslations;
}

export interface VelomarkProviderProps {
  allowedTags?: AllowedTags;
  animated?: boolean | AnimateOptions;
  caret?: VelomarkCaret;
  children: JSX.Element;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  codeBlockRenderers?: Record<string, Component<VelomarkCodeBlockRendererProps>>;
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  controls?: ControlsConfig;
  debug?: boolean;
  dir?: "auto" | "ltr" | "rtl";
  icons?: Partial<IconMap>;
  lineNumbers?: boolean;
  linkSafety?: boolean;
  literalTagContent?: string[];
  markdown: string;
  onAnimationEnd?: () => void;
  onAnimationStart?: () => void;
  onDebugMetrics?: (metrics: VelomarkDebugMetrics) => void;
  plugins?: PluginConfig;
  remend?: RemendOptions;
  translations?: Partial<VelomarkTranslations>;
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
    buildRenderDocument(undefined, props.markdown, props.remend),
  );

  createEffect(() => {
    const previous = unwrap(document);
    const next = buildRenderDocument(previous, props.markdown, props.remend);
    props.onDebugMetrics?.(collectRenderMetrics(previous.blocks, next.blocks));
    setDocument(reconcile(next, { key: "id" }));
  });

  const isStreaming = createMemo(() => document.blocks.some((b) => b.status === "streaming"));

  const [linkSafetyUrl, setLinkSafetyUrl] = createSignal<string | null>(null);

  let wasIncomplete = false;
  createEffect(() => {
    const incomplete = hasIncompleteCodeFence(props.markdown);
    if (incomplete && !wasIncomplete) {
      props.onAnimationStart?.();
    } else if (!incomplete && wasIncomplete) {
      props.onAnimationEnd?.();
    }
    wasIncomplete = incomplete;
  });

  const store: VelomarkStore = {
    allowedTags: props.allowedTags,
    plugins: props.plugins ?? {},
    animationConfig: resolveAnimationConfig(props.animated),
    caret: props.caret,
    codeBlockOptions: props.codeBlockOptions,
    codeBlockRenderers: props.codeBlockRenderers,
    containers: props.containers,
    controls: props.controls,
    debug: props.debug ?? false,
    dir: props.dir,
    icons: resolveIcons(props.icons),
    lineNumbers: props.lineNumbers,
    linkSafety: props.linkSafety,
    literalTagContent: props.literalTagContent,
    get linkSafetyUrl() {
      return linkSafetyUrl();
    },
    openLinkSafety: (url: string) => setLinkSafetyUrl(url),
    get document() {
      return document;
    },
    get blockIds() {
      return document.blocks.map((b) => b.id);
    },
    get isStreaming() {
      return isStreaming;
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
    get t() {
      return resolveTranslations(props.translations);
    },
  };

  return <VelomarkContext.Provider value={store}>{props.children}</VelomarkContext.Provider>;
}

export { VelomarkContext };
