import { type Component, createMemo, For, Match, Show, Switch } from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "cnfast";

import type { HtmlElementChild } from "../../lib/parser/html-element";
import type { AnimationConfig, WordMeta } from "../../lib/animation/compute-animation";
import type { InlineToken } from "../../types";
import { useVelomark } from "../../lib/velomark-context";
import { useBlock } from "../../lib/block-context";
import { directiveAttributeProps } from "../compat/directives/directive-attribute-props";
import { HtmlElementView } from "../compat/html/html-element-view";
import { ImageComponent } from "../image";
import { MathView } from "../compat/math/math-view";
import { AnimatedText } from "./animated-text";

type TokenOf<T extends InlineToken["type"]> = Extract<InlineToken, { type: T }>;

type AnimMetaAccessor = () => Map<string, WordMeta[]> | null;

const NULL_ANIM_META: AnimMetaAccessor = () => null;

function assertNever(value: never): never {
  throw new Error(`Unsupported inline token: ${JSON.stringify(value)}`);
}

const AnimatedTextToken: Component<{
  token: InlineToken;
  path: string;
  config: AnimationConfig;
  animMeta: AnimMetaAccessor;
}> = (props) => {
  const block = useBlock();
  return (
    <Show when={block.isStreaming} fallback={(props.token as TokenOf<"text">).text}>
      <AnimatedText
        text={(props.token as TokenOf<"text">).text}
        path={props.path}
        config={props.config}
        animMeta={props.animMeta}
      />
    </Show>
  );
};

export const InlineTokenView: Component<{
  token: InlineToken;
  path?: string;
  animMeta?: AnimMetaAccessor;
  config?: AnimationConfig;
}> = (props) => {
  const vm = useVelomark();
  const tokenPath = () => props.path ?? "";
  const animMeta: AnimMetaAccessor = props.animMeta ?? NULL_ANIM_META;

  return (
    <Switch fallback={<>{assertNever(props.token as never)}</>}>
      <Match when={props.token.type === "break"}>
        <br />
      </Match>
      <Match when={props.token.type === "text"}>
        <Show when={props.config} fallback={(props.token as TokenOf<"text">).text}>
          <AnimatedTextToken
            token={props.token}
            path={tokenPath()}
            config={props.config!}
            animMeta={animMeta}
          />
        </Show>
      </Match>
      <Match when={props.token.type === "footnote-reference"}>
        <sup>
          <a
            href={`#fn-${(props.token as TokenOf<"footnote-reference">).identifier}`}
            id={`fnref-${(props.token as TokenOf<"footnote-reference">).identifier}`}
          >
            [{(props.token as TokenOf<"footnote-reference">).identifier}]
          </a>
        </sup>
      </Match>
      <Match when={props.token.type === "inline-math"}>
        <span class={cn("vm-math inline-flex align-middle")}>
          <MathView displayMode={false} formula={(props.token as TokenOf<"inline-math">).value} />
        </span>
      </Match>
      <Match when={props.token.type === "html"}>
        <span class={cn("vm-html")} innerHTML={(props.token as TokenOf<"html">).value} />
      </Match>
      <Match when={props.token.type === "html-element"}>
        <HtmlElementView
          attributes={(props.token as TokenOf<"html-element">).attributes}
          children={(props.token as TokenOf<"html-element">).children.map((child) => ({
            token: child,
            type: "inline-token" as const,
          }))}
          tagName={(props.token as TokenOf<"html-element">).tagName}
        />
      </Match>
      <Match when={props.token.type === "text-directive"}>
        <Show
          when={vm.containers?.[(props.token as TokenOf<"text-directive">).name]}
          fallback={
            <span
              class={cn("rounded bg-muted px-1 py-0.5 text-sm")}
              data-velomark-text-directive={(props.token as TokenOf<"text-directive">).name}
              {...directiveAttributeProps((props.token as TokenOf<"text-directive">).attributes)}
            >
              <RenderInlineTokens
                tokens={(props.token as TokenOf<"text-directive">).children}
                animMeta={animMeta}
                config={props.config}
                basePath={`${tokenPath()}.`}
              />
            </span>
          }
        >
          {(CustomContainer) => (
            <Dynamic
              attributes={(props.token as TokenOf<"text-directive">).attributes}
              component={CustomContainer()}
              name={(props.token as TokenOf<"text-directive">).name}
            >
              <RenderInlineTokens
                tokens={(props.token as TokenOf<"text-directive">).children}
                animMeta={animMeta}
                config={props.config}
                basePath={`${tokenPath()}.`}
              />
            </Dynamic>
          )}
        </Show>
      </Match>
      <Match when={props.token.type === "code"}>
        <code class={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-sm")}>
          {(props.token as TokenOf<"code">).text}
        </code>
      </Match>
      <Match when={props.token.type === "delete"}>
        <del>
          <RenderInlineTokens
            tokens={(props.token as TokenOf<"delete">).children}
            animMeta={animMeta}
            config={props.config}
            basePath={`${tokenPath()}.`}
          />
        </del>
      </Match>
      <Match when={props.token.type === "emphasis"}>
        <em>
          <RenderInlineTokens
            tokens={(props.token as TokenOf<"emphasis">).children}
            animMeta={animMeta}
            config={props.config}
            basePath={`${tokenPath()}.`}
          />
        </em>
      </Match>
      <Match when={props.token.type === "image"}>
        <ImageComponent
          alt={(props.token as TokenOf<"image">).alt}
          src={(props.token as TokenOf<"image">).src}
          title={(props.token as TokenOf<"image">).title}
        />
      </Match>
      <Match when={props.token.type === "strong"}>
        <strong class={cn("font-semibold")}>
          <RenderInlineTokens
            tokens={(props.token as TokenOf<"strong">).children}
            animMeta={animMeta}
            config={props.config}
            basePath={`${tokenPath()}.`}
          />
        </strong>
      </Match>
      <Match when={props.token.type === "link"}>
        <a
          class={cn("font-medium text-primary underline wrap-anywhere")}
          href={(props.token as TokenOf<"link">).href}
          rel="noopener noreferrer"
          target="_blank"
          title={(props.token as TokenOf<"link">).title}
        >
          <RenderInlineTokens
            tokens={(props.token as TokenOf<"link">).children}
            animMeta={animMeta}
            config={props.config}
            basePath={`${tokenPath()}.`}
          />
        </a>
      </Match>
    </Switch>
  );
};

export type HtmlElementRenderChild =
  | HtmlElementChild
  | {
      token: InlineToken;
      type: "inline-token";
    };

export const RenderInlineTokens: Component<{
  tokens: InlineToken[];
  animMeta?: AnimMetaAccessor;
  config?: AnimationConfig;
  basePath?: string;
}> = (props) => {
  // String keys — primitives compared by value, so <For> preserves items
  // across re-renders even when the underlying token objects are recreated.
  const keys = createMemo(() => props.tokens.map((_, i) => String(i)));

  return (
    <For each={keys()}>
      {(_key, forIndex) => (
        <InlineTokenView
          token={props.tokens[forIndex()]!}
          path={`${props.basePath ?? ""}${forIndex()}`}
          animMeta={props.animMeta}
          config={props.config}
        />
      )}
    </For>
  );
};
