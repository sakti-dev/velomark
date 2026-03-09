import type { Component } from "solid-js";
import styles from "./App.module.css";
import { Velomark } from "src";

const App: Component = () => {
  const markdown = `# Velomark

Streaming-first markdown rendering for AI responses.`;

  return (
    <div class={styles.App}>
      <header class={styles.header}>
        <h1>Velomark</h1>
        <p>Solid-only markdown rendering tuned for streamed AI output.</p>
        <Velomark markdown={markdown} />
      </header>
    </div>
  );
};

export default App;
