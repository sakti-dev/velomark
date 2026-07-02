import type { Component } from "solid-js";
import { For, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { parseInline } from "../../../lib/parser/inline-parser";
import { useVelomark } from "../../../lib/velomark-context";
import { type HtmlElementRenderChild, RenderInlineTokens } from "../../inline/inline-token-view";

export const HtmlElementView: Component<{
  attributes?: Record<string, string>;
  children: HtmlElementRenderChild[];
  tagName: string;
}> = (props) => {
  const vm = useVelomark();

  const isAllowed = () => {
    if (!vm.allowedTags) return true;
    return props.tagName in vm.allowedTags;
  };

  const isLiteral = () => {
    if (!vm.literalTagContent) return false;
    const lower = props.tagName.toLowerCase();
    return vm.literalTagContent.some((t) => t.toLowerCase() === lower);
  };

  const filteredAttributes = () => {
    if (!vm.allowedTags) return props.attributes;
    const allowed = vm.allowedTags[props.tagName];
    if (!allowed || !props.attributes) return props.attributes;
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(props.attributes)) {
      if (allowed.includes(key)) {
        filtered[key] = value;
      }
    }
    return filtered;
  };

  const inner = (
    <For each={props.children}>
      {(child) => {
        if (child.type === "text" && isLiteral()) {
          return <>{child.text}</>;
        }
        if (child.type === "text") {
          return <RenderInlineTokens tokens={parseInline(child.text, vm.definitions)} />;
        }
        if (child.type === "inline-token") {
          return <RenderInlineTokens tokens={[child.token]} />;
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
  );

  if (!isAllowed()) {
    return inner;
  }

  return (
    <Dynamic component={props.tagName as keyof JSX.IntrinsicElements} {...filteredAttributes()}>
      {inner}
    </Dynamic>
  );
};
