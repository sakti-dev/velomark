import type { Component } from "solid-js";

export interface VelomarkProps {
  class?: string;
  markdown: string;
}

export const Velomark: Component<VelomarkProps> = (props) => {
  return (
    <div class={props.class} data-velomark-root="">
      <p>{props.markdown}</p>
    </div>
  );
};
