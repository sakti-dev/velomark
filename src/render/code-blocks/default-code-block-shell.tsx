import { createSignal, type Component, type JSX } from "solid-js";
import type { VelomarkCodeBlockOptions } from "../../types";

const DEFAULT_CODE_BLOCK_OPTIONS: Required<VelomarkCodeBlockOptions> = {
  copyButton: true,
  defaultView: "preview",
  languageLabel: true,
  previewToggle: true,
};

export const resolveCodeBlockOptions = (
  options?: VelomarkCodeBlockOptions
): Required<VelomarkCodeBlockOptions> => ({
  ...DEFAULT_CODE_BLOCK_OPTIONS,
  ...options,
});

export const DefaultCodeBlockShell: Component<{
  code: string;
  language?: string;
  options?: VelomarkCodeBlockOptions;
  preview?: JSX.Element;
  source: JSX.Element;
}> = (props) => {
  const options = (): Required<VelomarkCodeBlockOptions> =>
    resolveCodeBlockOptions(props.options);
  const [view, setView] = createSignal<"preview" | "source">(
    options().defaultView
  );
  const [copied, setCopied] = createSignal<boolean>(false);
  const canPreview = (): boolean => props.preview !== undefined;
  const shouldShowPreview = (): boolean =>
    canPreview() && (!options().previewToggle || view() === "preview");

  const copyCode = async (): Promise<void> => {
    setCopied(true);
    try {
      await navigator.clipboard.writeText(props.code);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 1_500);
    } catch {
      setCopied(false);
      return;
    }
  };

  return (
    <>
      <div data-velomark-code-header="">
        {options().languageLabel && props.language ? (
          <div data-velomark-code-language="">{props.language}</div>
        ) : <div />}
        <div data-velomark-code-actions="">
          {canPreview() && options().previewToggle ? (
            <button
              aria-label={shouldShowPreview() ? "Show source" : "Show preview"}
              data-velomark-code-view-toggle=""
              onClick={() => {
                setView((current) => (current === "preview" ? "source" : "preview"));
              }}
              type="button"
            >
              {shouldShowPreview() ? "Source" : "Preview"}
            </button>
          ) : null}
          {options().copyButton ? (
            <button
              aria-label={copied() ? "Copied code" : "Copy code"}
              data-velomark-code-copy=""
              data-velomark-code-copy-state={copied() ? "copied" : "idle"}
              onClick={() => {
                void copyCode();
              }}
              type="button"
            >
              {copied() ? "Copied" : "Copy"}
            </button>
          ) : null}
        </div>
      </div>
      {shouldShowPreview() ? props.preview : props.source}
    </>
  );
};
