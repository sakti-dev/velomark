import { type Component, For, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "cnfast";

import type { HtmlElementChild } from "../../parser/html-element";
import type {
  InlineToken,
  ReferenceDefinitionMap,
  VelomarkContainerRendererProps,
} from "../../types";
import { directiveAttributeProps } from "../directives/directive-attribute-props";
import { HtmlElementView } from "../html-element-view";
import { MathView } from "../math/math-view";

function renderImageToken(token: Extract<InlineToken, { type: "image" }>): JSX.Element {
  return (
    <img
      alt={token.alt}
      class={cn("max-w-full rounded-lg")}
      loading="lazy"
      src={token.src}
      title={token.title}
    />
  );
}

function assertNever(value: never): never {
  throw new Error(`Unsupported inline token: ${JSON.stringify(value)}`);
}

export const renderInlineToken = (
  token: InlineToken,
  containers?: Record<string, Component<VelomarkContainerRendererProps>>,
  definitions?: ReferenceDefinitionMap,
): JSX.Element => {
  switch (token.type) {
    case "break":
      return <br />;
    case "text":
      return token.text;
    case "footnote-reference":
      return (
        <sup>
          <a href={`#fn-${token.identifier}`} id={`fnref-${token.identifier}`}>
            [{token.identifier}]
          </a>
        </sup>
      );
    case "inline-math":
      return (
        <span class={cn("vm-math inline-flex align-middle")} data-velomark-inline-math="">
          <MathView displayMode={false} formula={token.value} />
        </span>
      );
    case "html":
      return <span data-velomark-inline-html="" innerHTML={token.value} />;
    case "html-element":
      return (
        <HtmlElementView
          attributes={token.attributes}
          children={token.children.map((child) => ({
            token: child,
            type: "inline-token" as const,
          }))}
          containers={containers}
          definitions={definitions}
          tagName={token.tagName}
        />
      );
    case "text-directive": {
      const CustomContainer = containers?.[token.name];
      const children = (
        <For each={token.children}>
          {(child) => renderInlineToken(child, containers, definitions)}
        </For>
      );

      if (CustomContainer) {
        return (
          <Dynamic attributes={token.attributes} component={CustomContainer} name={token.name}>
            {children}
          </Dynamic>
        );
      }

      return (
        <span
          class={cn("rounded bg-muted px-1 py-0.5 text-sm")}
          data-velomark-text-directive={token.name}
          {...directiveAttributeProps(token.attributes)}
        >
          {children}
        </span>
      );
    }
    case "code":
      return (
        <code class={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-sm")}>{token.text}</code>
      );
    case "delete":
      return (
        <del>
          <For each={token.children}>
            {(child) => renderInlineToken(child, containers, definitions)}
          </For>
        </del>
      );
    case "emphasis":
      return (
        <em>
          <For each={token.children}>
            {(child) => renderInlineToken(child, containers, definitions)}
          </For>
        </em>
      );
    case "image":
      return renderImageToken(token);
    case "strong":
      return (
        <strong class={cn("font-semibold")}>
          <For each={token.children}>
            {(child) => renderInlineToken(child, containers, definitions)}
          </For>
        </strong>
      );
    case "link":
      return (
        <a
          class={cn("font-medium text-primary underline wrap-anywhere")}
          href={token.href}
          rel="noopener noreferrer"
          target="_blank"
          title={token.title}
        >
          <For each={token.children}>
            {(child) => renderInlineToken(child, containers, definitions)}
          </For>
        </a>
      );
    default:
      return assertNever(token);
  }
};

export type HtmlElementRenderChild =
  | HtmlElementChild
  | {
      token: InlineToken;
      type: "inline-token";
    };

export const RenderInlineTokens: Component<{
  containers?: Record<string, Component<VelomarkContainerRendererProps>>;
  definitions?: ReferenceDefinitionMap;
  tokens: InlineToken[];
}> = (props) => {
  return (
    <For each={props.tokens}>
      {(token) => renderInlineToken(token, props.containers, props.definitions)}
    </For>
  );
};
