import type { BundledTheme, HighlighterGeneric, ThemedToken } from "shiki";
import { For, Show, createEffect, createSignal, on, type Component } from "solid-js";
import { getShikiManager } from "./shiki-manager";

const DEFAULT_HIGHLIGHT_THEME = "github-dark";
const isBrowser = typeof window !== "undefined";

export const HighlightedCodeBlock: Component<{
  code: string;
  language?: string;
  theme?: string;
}> = (props) => {
  const [highlightedTokens, setHighlightedTokens] = createSignal<ThemedToken[][]>([]);
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
      const tokens = highlighter()!.codeToTokensBase(props.code, {
        lang: resolvedLanguage(),
        theme: resolvedTheme(),
      });
      if (currentRequestId !== requestId) {
        return;
      }

      setHighlightedTokens(tokens);
      setStreamError(false);
    } catch {
      if (currentRequestId !== requestId) {
        return;
      }

      setHighlightedTokens([]);
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
          setHighlightedTokens([]);
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
        <Show when={!streamError() && highlightedTokens().length > 0} fallback={props.code}>
          <For each={highlightedTokens()}>
            {(line, lineIndex) => (
              <>
                <For each={line}>
                  {(token) => (
                    <span style={buildTokenStyle(token)}>{token.content}</span>
                  )}
                </For>
                <Show when={lineIndex() < highlightedTokens().length - 1}>{"\n"}</Show>
              </>
            )}
          </For>
        </Show>
      </code>
    </pre>
  );
};

const buildTokenStyle = (token: ThemedToken): Record<string, string> => {
  const style: Record<string, string> = {};

  if (token.color) {
    style.color = token.color;
  }

  if (typeof token.fontStyle === "number") {
    if ((token.fontStyle & 1) !== 0) {
      style["font-style"] = "italic";
    }

    if ((token.fontStyle & 2) !== 0) {
      style["font-weight"] = "700";
    }

    if ((token.fontStyle & 4) !== 0) {
      style["text-decoration"] = "underline";
    }
  }

  return style;
};
