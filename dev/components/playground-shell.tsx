import type { Component, JSX } from "solid-js";

export interface PlaygroundShellProps {
  controls: JSX.Element;
  renderer: JSX.Element;
}

export const PlaygroundShell: Component<PlaygroundShellProps> = (props) => {
  return (
    <div class="playground-shell">
      <header class="playground-hero">
        <h1>Velomark Playground</h1>
        <p>
          Streaming-oriented renderer playground for append updates, tail rewrites,
          and DOM stability checks.
        </p>
      </header>
      <div class="playground-grid">
        <aside class="playground-controls">{props.controls}</aside>
        <main class="playground-main">{props.renderer}</main>
      </div>
    </div>
  );
};
