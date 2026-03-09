import type { Component } from "solid-js";
import type { CodeBlockData } from "../../parser/block-boundaries";
import type { RenderBlock } from "../../types";

export const CodeBlock: Component<{
  block: RenderBlock<CodeBlockData>;
  debug?: boolean;
  index: number;
}> = (props) => {
  const language = () => props.block.data.language?.trim() || undefined;

  return (
    <div
      data-velomark-block-id={props.debug ? props.block.id : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
      data-velomark-language={language() ?? ""}
    >
      {language() ? (
        <div data-velomark-code-language="">{language()}</div>
      ) : null}
      <pre>
        <code>{props.block.data.code}</code>
      </pre>
    </div>
  );
};
