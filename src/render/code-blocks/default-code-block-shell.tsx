import type { Component, JSX } from "solid-js";
import type { VelomarkCodeBlockOptions } from "../../types";

const DEFAULT_CODE_BLOCK_OPTIONS: Required<VelomarkCodeBlockOptions> = {
  copyButton: true,
  languageLabel: true,
};

export const resolveCodeBlockOptions = (
  options?: VelomarkCodeBlockOptions
): Required<VelomarkCodeBlockOptions> => ({
  ...DEFAULT_CODE_BLOCK_OPTIONS,
  ...options,
});

export const DefaultCodeBlockShell: Component<{
  body: JSX.Element;
  code: string;
  language?: string;
  options?: VelomarkCodeBlockOptions;
}> = (props) => {
  const options = (): Required<VelomarkCodeBlockOptions> =>
    resolveCodeBlockOptions(props.options);

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
      {props.body}
    </>
  );
};
