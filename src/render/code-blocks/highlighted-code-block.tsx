import type { ThemedToken } from "@shikijs/core";
import { getTokenStyleObject } from "@shikijs/core";
import { CodeToTokenTransformStream } from "shiki-stream";
import type { BundledTheme, HighlighterGeneric } from "shiki";
import {
  For,
  Show,
  batch,
  createEffect,
  createSignal,
  on,
  onCleanup,
  type Component,
} from "solid-js";
import { getShikiManager } from "./shiki-manager";

const DEFAULT_HIGHLIGHT_THEME = "github-dark";
const isBrowser = typeof window !== "undefined";

export const HighlightedCodeBlock: Component<{
  code: string;
  language?: string;
  theme?: string;
}> = (props) => {
  const [tokens, setTokens] = createSignal<ThemedToken[]>([]);
  const [streamError, setStreamError] = createSignal(false);
  const [highlightedHtml, setHighlightedHtml] = createSignal("");
  const [resolvedLanguage, setResolvedLanguage] = createSignal("text");
  const [resolvedTheme, setResolvedTheme] = createSignal(DEFAULT_HIGHLIGHT_THEME);
  const [highlighter, setHighlighter] =
    createSignal<HighlighterGeneric<any, any> | null>(null);
  let controller: ReadableStreamDefaultController<string> | null = null;
  let abortController: AbortController | null = null;
  let streamedCode = "";
  let sourceCode = "";

  const resetStream = (): void => {
    abortController?.abort();
    abortController = null;
    controller = null;
    streamedCode = "";
    setTokens([]);
    setStreamError(false);
  };

  const runFullHighlight = async (): Promise<void> => {
    if (!isBrowser || highlighter() === null) {
      return;
    }

    try {
      const html = await highlighter()!.codeToHtml(sourceCode, {
        lang: resolvedLanguage(),
        theme: resolvedTheme(),
      });
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      setHighlightedHtml(wrapper.querySelector("code")?.innerHTML ?? "");
    } catch {
      setHighlightedHtml("");
    }
  };

  const attachStream = (): void => {
    if (!isBrowser || highlighter() === null) {
      return;
    }

    resetStream();

    const textStream = new ReadableStream<string>({
      start(streamController) {
        controller = streamController;
      },
    });

    abortController = new AbortController();

    try {
      const tokenStream = textStream.pipeThrough(
        new CodeToTokenTransformStream({
          allowRecalls: true,
          highlighter: highlighter()!,
          lang: resolvedLanguage(),
          theme: resolvedTheme(),
        })
      );

      void tokenStream
        .pipeTo(
          new WritableStream({
            write(token) {
              if (abortController?.signal.aborted) {
                return;
              }

              batch(() => {
                if ("recall" in token) {
                  setTokens((current) => current.slice(0, -token.recall));
                } else {
                  setTokens((current) => [...current, token]);
                }
              });
            },
          }),
          { signal: abortController.signal }
        )
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }

          setStreamError(true);
        });
    } catch {
      setStreamError(true);
    }
  };

  const syncStreamToCode = (): void => {
    if (!isBrowser || controller === null || streamError()) {
      return;
    }

    if (sourceCode.startsWith(streamedCode)) {
      const incremental = sourceCode.slice(streamedCode.length);
      if (incremental.length > 0) {
        controller.enqueue(incremental);
        streamedCode = sourceCode;
        window.setTimeout(() => {
          if (tokens().length === 0) {
            void runFullHighlight();
          }
        }, 0);
      }
      return;
    }

    attachStream();
    if (sourceCode.length > 0) {
      controller.enqueue(sourceCode);
      streamedCode = sourceCode;
      window.setTimeout(() => {
        if (tokens().length === 0) {
          void runFullHighlight();
        }
      }, 0);
    }
  };

  createEffect(() => {
    sourceCode = props.code;
  });

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
          attachStream();
          syncStreamToCode();
          void runFullHighlight();
        } catch {
          setStreamError(true);
        }
      },
      { defer: false }
    )
  );

  createEffect(() => {
    sourceCode = props.code;
    syncStreamToCode();
  });

  onCleanup(() => {
    resetStream();
  });

  return (
    <pre>
      <code
        data-velomark-code-highlighted={
          !streamError() && (tokens().length > 0 || highlightedHtml().length > 0)
            ? ""
            : undefined
        }
      >
        <Show
          when={!streamError() && tokens().length > 0}
          fallback={
            highlightedHtml().length > 0 ? (
              <span innerHTML={highlightedHtml()} />
            ) : (
              props.code
            )
          }
        >
          <For each={tokens()}>
            {(token) => (
              <span style={token.htmlStyle ?? getTokenStyleObject(token)}>
                {token.content}
              </span>
            )}
          </For>
        </Show>
      </code>
    </pre>
  );
};
