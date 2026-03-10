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
  const canPreview = (): boolean => props.preview !== undefined;
  const shouldShowPreview = (): boolean =>
    canPreview() && view() === "preview" && options().previewToggle;

  const copyCode = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(props.code);
    } catch {
      return;
    }
  };

  return (
    <>
      {options().languageLabel && props.language ? (
        <div data-velomark-code-language="">{props.language}</div>
      ) : null}
      {options().copyButton ? (
        <button
          aria-label="Copy code"
          data-velomark-code-copy=""
          onClick={() => {
            void copyCode();
          }}
          type="button"
        >
          Copy
        </button>
      ) : null}
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
      {shouldShowPreview() ? props.preview : props.source}
    </>
  );
};
