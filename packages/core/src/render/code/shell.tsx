import { type Component, createSignal, type JSX } from "solid-js";
import { cn } from "cnfast";

import type { VelomarkCodeBlockOptions } from "../../types";

const COPY_RESET_DELAY_MS = 2000;

const DEFAULT_CODE_BLOCK_OPTIONS: Required<VelomarkCodeBlockOptions> = {
  copyButton: true,
  defaultView: "preview",
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

const CopyIcon: Component = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="16"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    width="16"
  >
    <rect height="14" rx="2" ry="2" width="14" x="8" y="8" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const CheckIcon: Component = () => (
  <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 16 16" width="14">
    <path
      d="m3.5 8.25 2.5 2.5 6-6"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.6"
    />
  </svg>
);

export const CopyCodeButton: Component<{ code: string }> = (props) => {
  const [copied, setCopied] = createSignal<boolean>(false);

  const copyCode = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(props.code);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, COPY_RESET_DELAY_MS);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      aria-label={copied() ? "Copied code" : "Copy code"}
      class={cn(
        "vm-code-copy absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-all hover:bg-muted hover:text-foreground active:translate-y-px",
        copied() && "text-primary",
      )}
      onClick={() => copyCode()}
      type="button"
    >
      {copied() ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
};

export const CodeBlockLanguageBadge: Component<{ language?: string }> = (props) =>
  props.language ? (
    <div
      class={cn(
        "vm-code-language absolute bottom-2 right-2 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs lowercase text-muted-foreground",
      )}
    >
      {props.language}
    </div>
  ) : null;

export const CodeBlockOverlayControls: Component<{
  code: string;
  language?: string;
  options?: VelomarkCodeBlockOptions;
}> = (props) => {
  const options = (): Required<VelomarkCodeBlockOptions> => resolveCodeBlockOptions(props.options);

  return (
    <>
      {options().copyButton ? <CopyCodeButton code={props.code} /> : null}
      {options().languageLabel ? <CodeBlockLanguageBadge language={props.language} /> : null}
    </>
  );
};

export const DefaultCodeBlockShell: Component<{
  code: string;
  language?: string;
  options?: VelomarkCodeBlockOptions;
  preview?: JSX.Element;
  source: JSX.Element;
}> = (props) => (
  <>
    <CodeBlockOverlayControls code={props.code} language={props.language} options={props.options} />
    {props.preview ?? props.source}
  </>
);
