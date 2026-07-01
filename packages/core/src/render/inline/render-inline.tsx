import { type Component, createMemo, useContext } from "solid-js";
import { parseInline } from "../../lib/parser/inline-parser";
import { useVelomark } from "../../lib/velomark-context";
import { BlockContext } from "../../lib/block-context";
import { computeAnimation, resolveAnimationConfig } from "../../lib/animation/compute-animation";
import { RenderInlineTokens } from "./inline-token-view";

export const RenderInline: Component<{ text?: string }> = (props) => {
  const vm = useVelomark();
  const blockAccessor = useContext(BlockContext);

  const tokens = createMemo(() => parseInline(props.text ?? "", vm.definitions));

  const resolvedConfig = vm.animationConfig ? resolveAnimationConfig(vm.animationConfig) : null;

  // Mutable coordinator — persists across memo re-evaluations.
  // Monotonically growing: never reset. When the block briefly flips to
  // "complete" between stream chunks, animMeta returns null (no COMPUTE),
  // so prevContentLength is untouched. When it resumes streaming, old words
  // (offset < prevContentLength) correctly get duration=0.
  let prevContentLength = 0;

  // Single-pass animation pre-computation. Walks ALL tokens with a shared
  // character counter so stagger is continuous across bold/italic/link
  // boundaries — matching streamdown's visitParents algorithm exactly.
  const animMeta = createMemo(() => {
    const ts = tokens();
    const isStreaming = blockAccessor?.()?.isStreaming ?? false;
    const status = blockAccessor?.()?.status ?? "no-block";
    if (!resolvedConfig || !isStreaming) {
      console.log("[RenderInline.animMeta] SKIP", {
        hasConfig: !!resolvedConfig,
        isStreaming,
        status,
        text: props.text?.slice(0, 60),
        prevContentLength,
        tokenCount: ts.length,
      });
      return null;
    }

    const result = computeAnimation(ts, resolvedConfig, prevContentLength);
    console.log("[RenderInline.animMeta] COMPUTE", {
      text: props.text?.slice(0, 60),
      prevContentLength,
      totalChars: result.totalChars,
      entryCount: result.entries.size,
      paths: [...result.entries.keys()],
    });
    prevContentLength = result.totalChars;
    return result.entries;
  });

  return (
    <RenderInlineTokens
      tokens={tokens()}
      animMeta={animMeta}
      config={resolvedConfig ?? undefined}
    />
  );
};
