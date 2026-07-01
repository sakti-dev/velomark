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
  return (
    <Dynamic component={props.tagName as keyof JSX.IntrinsicElements} {...props.attributes}>
      <For each={props.children}>
        {(child) => {
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
    </Dynamic>
  );
};
