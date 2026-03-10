import { Dynamic } from "solid-js/web";
import { For, type JSX } from "solid-js";
import type { HtmlElementChild } from "../parser/html-element";
import type { InlineToken } from "../types";

function renderInlineToken(token: InlineToken): JSX.Element {
  switch (token.type) {
    case "text":
      return token.text;
    case "code":
      return <code>{token.text}</code>;
    case "break":
      return <br />;
    case "emphasis":
      return <em><For each={token.children}>{renderInlineToken}</For></em>;
    case "strong":
      return <strong><For each={token.children}>{renderInlineToken}</For></strong>;
    case "delete":
      return <del><For each={token.children}>{renderInlineToken}</For></del>;
    case "link":
      return (
        <a href={token.href} rel="noopener noreferrer" target="_blank" title={token.title}>
          <For each={token.children}>{renderInlineToken}</For>
        </a>
      );
    case "image":
      return <img alt={token.alt} loading="lazy" src={token.src} title={token.title} />;
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
        <span data-velomark-inline-math="">
          <code>{token.value}</code>
        </span>
      );
    case "html":
      return <span data-velomark-inline-html="">{token.value}</span>;
    case "text-directive":
      return (
        <span data-velomark-text-directive={token.name}>
          <For each={token.children}>{renderInlineToken}</For>
        </span>
      );
    case "html-element":
      return (
        <HtmlElementView
          attributes={token.attributes}
          children={token.children.map((child) => ({
            type: "inline-token" as const,
            token: child,
          }))}
          tagName={token.tagName}
        />
      );
  }
}

export type HtmlElementRenderChild =
  | HtmlElementChild
  | {
      token: InlineToken;
      type: "inline-token";
    };

export function HtmlElementView(props: {
  attributes?: Record<string, string>;
  children: HtmlElementRenderChild[];
  tagName: string;
}) {
  return (
    <Dynamic component={props.tagName as keyof JSX.IntrinsicElements} {...props.attributes}>
      <For each={props.children}>
        {(child) => {
          if (child.type === "text") {
            return child.text;
          }
          if (child.type === "inline-token") {
            return renderInlineToken(child.token);
          }
          return (
            <HtmlElementView
              attributes={child.node.attributes}
              children={child.node.children}
              tagName={child.node.tagName}
            />
          );
        }}
      </For>
    </Dynamic>
  );
}
