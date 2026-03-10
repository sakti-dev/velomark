import { For, type Component, type JSX } from "solid-js";
import { parseInline } from "../../parser/inline-parser";
import type { InlineToken, ReferenceDefinitionMap } from "../../types";

function renderToken(token: InlineToken): JSX.Element {
  switch (token.type) {
    case "text":
      return token.text;
    case "code":
      return <code>{token.text}</code>;
    case "delete":
      return (
        <del>
          <For each={token.children}>{(child) => renderToken(child)}</For>
        </del>
      );
    case "emphasis":
      return (
        <em>
          <For each={token.children}>{(child) => renderToken(child)}</For>
        </em>
      );
    case "image":
      return <img alt={token.alt} loading="lazy" src={token.src} />;
    case "strong":
      return (
        <strong>
          <For each={token.children}>{(child) => renderToken(child)}</For>
        </strong>
      );
    case "link":
      return (
        <a href={token.href} rel="noopener noreferrer" target="_blank">
          <For each={token.children}>{(child) => renderToken(child)}</For>
        </a>
      );
  }
}

export const RenderInline: Component<{
  definitions?: ReferenceDefinitionMap;
  text: string;
}> = (props) => {
  const tokens = () => parseInline(props.text, props.definitions);

  return <For each={tokens()}>{(token) => renderToken(token)}</For>;
};
