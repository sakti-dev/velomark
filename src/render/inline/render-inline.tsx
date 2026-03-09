import { For, type Component, type JSX } from "solid-js";
import { parseInline } from "../../parser/inline-parser";
import type { InlineToken } from "../../types";

function renderToken(token: InlineToken): JSX.Element {
  switch (token.type) {
    case "text":
      return token.text;
    case "code":
      return <code>{token.text}</code>;
    case "emphasis":
      return (
        <em>
          <For each={token.children}>{(child) => renderToken(child)}</For>
        </em>
      );
    case "strong":
      return (
        <strong>
          <For each={token.children}>{(child) => renderToken(child)}</For>
        </strong>
      );
    case "link":
      return (
        <a href={token.href}>
          <For each={token.children}>{(child) => renderToken(child)}</For>
        </a>
      );
  }
}

export const RenderInline: Component<{ text: string }> = (props) => {
  const tokens = () => parseInline(props.text);

  return <For each={tokens()}>{(token) => renderToken(token)}</For>;
};
