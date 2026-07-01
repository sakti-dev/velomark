import { type Component, createEffect, createMemo, useContext } from "solid-js";
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

  // Mutable coordinator — persists across memo re-evaluations within a
  // streaming session. Words whose character offset falls below this value
  // are already visible and get duration=0 (no re-animation).
  let prevContentLength = 0;

  // Single-pass animation pre-computation. Walks ALL tokens with a shared
  // character counter so stagger is continuous across bold/italic/link
  // boundaries — matching streamdown's visitParents algorithm exactly.
  const animMeta = createMemo(() => {
    const ts = tokens();
    const isStreaming = blockAccessor?.()?.isStreaming ?? false;
    if (!resolvedConfig || !isStreaming) return null;

    const result = computeAnimation(ts, resolvedConfig, prevContentLength);
    prevContentLength = result.totalChars;
    return result.entries;
  });

  // Reset when the block completes streaming so the next streaming session
  // starts fresh. Effects run after memos, so this fires after animMeta
  // returns null — safe ordering.
  createEffect(() => {
    const isStreaming = blockAccessor?.()?.isStreaming ?? false;
    if (!isStreaming) prevContentLength = 0;
  });

  return (
    <RenderInlineTokens
      tokens={tokens()}
      animMeta={animMeta}
      config={resolvedConfig ?? undefined}
    />
  );
};
