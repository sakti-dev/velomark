import type { BundledTheme, HighlighterGeneric } from "shiki";
import { Show, createEffect, createSignal, on, type Component } from "solid-js";
import { getShikiManager } from "./shiki-manager";

const DEFAULT_HIGHLIGHT_THEME = "github-dark";
const isBrowser = typeof window !== "undefined";

export const HighlightedCodeBlock: Component<{
  code: string;
  language?: string;
  theme?: string;
}> = (props) => {
  const [highlightedHtml, setHighlightedHtml] = createSignal("");
  const [streamError, setStreamError] = createSignal(false);
  const [resolvedLanguage, setResolvedLanguage] = createSignal("text");
  const [resolvedTheme, setResolvedTheme] = createSignal(DEFAULT_HIGHLIGHT_THEME);
  const [highlighter, setHighlighter] =
    createSignal<HighlighterGeneric<any, any> | null>(null);
  let requestId = 0;

  const highlightCode = async (): Promise<void> => {
    if (!isBrowser || highlighter() === null) {
      return;
    }

    requestId += 1;
    const currentRequestId = requestId;

    try {
      const html = await highlighter()!.codeToHtml(props.code, {
        lang: resolvedLanguage(),
        theme: resolvedTheme(),
      });
      if (currentRequestId !== requestId) {
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      setHighlightedHtml(wrapper.querySelector("code")?.innerHTML ?? "");
      setStreamError(false);
    } catch {
      if (currentRequestId !== requestId) {
        return;
      }

      setHighlightedHtml("");
      setStreamError(true);
    }
  };

  createEffect(
    on(
      [() => props.language, () => props.theme],
      async ([nextLanguageInput, nextThemeInput]) => {
        const nextTheme = nextThemeInput ?? DEFAULT_HIGHLIGHT_THEME;
        const nextLanguage = nextLanguageInput?.trim() || "text";

        if (!isBrowser) {
          return;
        }

        try {
          const resolved = await getShikiManager().ensureLanguage(
            nextTheme as BundledTheme,
            nextLanguage
          );
          setResolvedLanguage(resolved.language);
          setResolvedTheme(nextTheme);
          setHighlighter(resolved.highlighter);
          setStreamError(false);
          void highlightCode();
        } catch {
          setHighlightedHtml("");
          setStreamError(true);
        }
      },
      { defer: false }
    )
  );

  createEffect(() => {
    void props.code;
    void highlightCode();
  });

  return (
    <pre>
      <code data-velomark-code-highlighted={!streamError() ? "" : undefined}>
        <Show when={!streamError() && highlightedHtml().length > 0} fallback={props.code}>
          <span innerHTML={highlightedHtml()} />
        </Show>
      </code>
    </pre>
  );
};
