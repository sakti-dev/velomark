import { type Component, createMemo, For, Show } from "solid-js";
import type { AnimationConfig, WordMeta } from "../../lib/animation/compute-animation";
import { splitIntoChars, splitIntoWords } from "../../lib/animation/split-text";

/**
 * Pure renderer for animated text. Reads pre-computed metadata reactively
 * from `animMeta` (produced by `computeAnimation` in `RenderInline`).
 * The `<For>` callback runs once per word for DOM stability; metadata is
 * read reactively so styles update without remounting spans.
 */
export const AnimatedText: Component<{
  text: string;
  path: string;
  config: AnimationConfig;
  animMeta: () => Map<string, WordMeta[]> | null;
}> = (props) => {
  const words = createMemo(() =>
    props.config.sep === "char" ? splitIntoChars(props.text) : splitIntoWords(props.text),
  );

  const keys = createMemo(() => words().map((_, i) => String(i)));

  console.log("[AnimatedText] MOUNT", {
    path: props.path,
    text: props.text.slice(0, 50),
    wordCount: words().length,
    hasMeta: !!props.animMeta(),
    metaForPath: props.animMeta()?.get(props.path)?.length,
  });

  return (
    <For each={keys()}>
      {(_key, forIndex) => {
        const i = forIndex();
        const word = () => words()[i];
        const meta = () => props.animMeta()?.get(props.path)?.[i];

        const style = createMemo(() => {
          const m = meta();
          if (!m) return null;
          return {
            "--vm-animation": `vm-${props.config.animation}`,
            "--vm-duration": `${m.duration}ms`,
            "--vm-easing": props.config.easing,
            ...(m.delay ? { "--vm-delay": `${m.delay}ms` } : {}),
          };
        });

        return (
          <Show when={meta()?.isWhitespace === false} fallback={word()}>
            <span data-velomark-animate style={style() ?? undefined}>
              {word()}
            </span>
          </Show>
        );
      }}
    </For>
  );
};
