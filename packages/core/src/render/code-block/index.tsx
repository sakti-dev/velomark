import { type Component, type ComponentProps, createMemo, Show, splitProps } from "solid-js";
import { cn } from "cnfast";

import type { CodeHighlighterPlugin } from "../../lib/plugin-types";
import type { VelomarkCodeBlockOptions } from "../../types";
import { useBlock } from "../../lib/block-context";
import { CodeBlockBody } from "./body";
import { CodeBlockContainer } from "./container";
import { CodeBlockCopyButton } from "./copy-button";
import { CodeBlockContext } from "./context";
import { CodeBlockDownloadButton } from "./download-button";
import { CodeBlockHeader } from "./header";
import { CodeBlockSkeleton } from "./skeleton";
import { HighlightedCodeBlockBody } from "./highlighted-body";

export { CodeBlockBody } from "./body";
export { CodeBlockContainer } from "./container";
export { CodeBlockCopyButton } from "./copy-button";
export { CodeBlockDownloadButton } from "./download-button";
export { CodeBlockHeader } from "./header";
export { CodeBlockSkeleton } from "./skeleton";
export { HighlightedCodeBlockBody } from "./highlighted-body";

export const DEFAULT_CODE_BLOCK_OPTIONS: Required<VelomarkCodeBlockOptions> = {
  copyButton: true,
  defaultView: "preview",
  downloadButton: true,
  highlight: true,
  highlightTheme: "github-dark",
  languageLabel: true,
  previewToggle: true,
};

export const resolveCodeBlockOptions = (
  options?: VelomarkCodeBlockOptions,
): Required<VelomarkCodeBlockOptions> => ({
  ...DEFAULT_CODE_BLOCK_OPTIONS,
  ...options,
});

type CodeBlockProps = ComponentProps<"div"> & {
  code: string;
  language?: string;
  /** Whether the code block is still being streamed (incomplete) */
  isIncomplete?: boolean;
  /** Show the copy control in the actions pill */
  copyButton?: boolean;
  /** Show the download control in the actions pill */
  downloadButton?: boolean;
  /** Show the language label in the header */
  languageLabel?: boolean;
  /** Highlight via the registered code plugin */
  highlight?: boolean;
  /** The resolved code highlighter plugin (when highlight is enabled) */
  codePlugin?: CodeHighlighterPlugin;
};

/**
 * Streamdown-aligned code block: a `bg-sidebar` container holding a top-left
 * language header, a sticky top-right actions pill, and a `bg-background`
 * body (raw or highlighted).
 */
export const CodeBlock: Component<CodeBlockProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "code",
    "language",
    "isIncomplete",
    "copyButton",
    "downloadButton",
    "languageLabel",
    "highlight",
    "codePlugin",
    "class",
    "children",
  ]);

  const block = useBlock();
  const isIncomplete = createMemo(() => block.isCodeFenceIncomplete);
  const showHighlighted = () => Boolean(local.highlight && local.codePlugin);

  return (
    <CodeBlockContext.Provider value={{ code: local.code }}>
      <CodeBlockContainer {...rest} isIncomplete={local.isIncomplete} language={local.language}>
        <CodeBlockHeader language={local.languageLabel ? local.language : undefined} />
        <Show when={local.copyButton}>
          <div
            class={cn(
              "vm-code-actions pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end",
            )}
          >
            <div
              class={cn(
                "pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur",
              )}
            >
              <CodeBlockCopyButton />
              <Show when={local.downloadButton}>
                <CodeBlockDownloadButton language={local.language} />
              </Show>
            </div>
          </div>
        </Show>
        <Show
          when={!isIncomplete() && showHighlighted()}
          fallback={
            <Show
              when={isIncomplete()}
              fallback={<CodeBlockBody code={local.code} language={local.language} />}
            >
              <CodeBlockSkeleton />
            </Show>
          }
        >
          <HighlightedCodeBlockBody
            code={local.code}
            language={local.language}
            plugin={local.codePlugin as CodeHighlighterPlugin}
          />
        </Show>
      </CodeBlockContainer>
    </CodeBlockContext.Provider>
  );
};
