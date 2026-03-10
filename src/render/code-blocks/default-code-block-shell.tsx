import { createSignal, type Component, type JSX } from "solid-js";
import type { VelomarkCodeBlockOptions } from "../../types";

const COPY_RESET_DELAY_MS = 2_000;

const DEFAULT_CODE_BLOCK_OPTIONS: Required<VelomarkCodeBlockOptions> = {
  copyButton: true,
  defaultView: "preview",
  highlight: true,
  highlightTheme: "github-dark",
  languageLabel: true,
  previewToggle: true,
};

export const resolveCodeBlockOptions = (
  options?: VelomarkCodeBlockOptions
): Required<VelomarkCodeBlockOptions> => ({
  ...DEFAULT_CODE_BLOCK_OPTIONS,
  ...options,
});

const CopyIcon: Component = () => (
  <svg
    aria-hidden="true"
    data-velomark-code-copy-icon="copy"
    fill="none"
    height="14"
    viewBox="0 0 16 16"
    width="14"
  >
    <rect
      height="8.5"
      rx="1.75"
      stroke="currentColor"
      stroke-width="1.4"
      width="7.5"
      x="5"
      y="3"
    />
    <path
      d="M4.25 12.5H3.5a1.5 1.5 0 0 1-1.5-1.5V4.75a1.5 1.5 0 0 1 1.5-1.5H10"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-width="1.4"
    />
  </svg>
);

const CheckIcon: Component = () => (
  <svg
    aria-hidden="true"
    data-velomark-code-copy-icon="check"
    fill="none"
    height="14"
    viewBox="0 0 16 16"
    width="14"
  >
    <path
      d="m3.5 8.25 2.5 2.5 6-6"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.6"
    />
  </svg>
);

export const CopyCodeButton: Component<{
  code: string;
}> = (props) => {
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
      data-velomark-code-copy=""
      data-velomark-code-copy-state={copied() ? "copied" : "idle"}
      onClick={() => {
        void copyCode();
      }}
      type="button"
    >
      {copied() ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
};

export const CodeBlockLanguageBadge: Component<{
  language?: string;
}> = (props) =>
  props.language ? (
    <div data-velomark-code-language="">{props.language}</div>
  ) : null;

export const CodeBlockOverlayControls: Component<{
  code: string;
  language?: string;
  options?: VelomarkCodeBlockOptions;
}> = (props) => {
  const options = (): Required<VelomarkCodeBlockOptions> =>
    resolveCodeBlockOptions(props.options);

  return (
    <>
      {options().copyButton ? <CopyCodeButton code={props.code} /> : null}
      {options().languageLabel ? (
        <CodeBlockLanguageBadge language={props.language} />
      ) : null}
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
    <CodeBlockOverlayControls
      code={props.code}
      language={props.language}
      options={props.options}
    />
    {props.preview ?? props.source}
  </>
);
