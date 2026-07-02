import type { Component } from "solid-js";
import { Dynamic } from "solid-js/web";

import type { CodeBlockData } from "../../lib/parser/block-boundaries";
import type { RenderBlock } from "../../types";
import { useVelomark } from "../../lib/velomark-context";
import { useBlock } from "../../lib/block-context";
import { CodeBlock, resolveCodeBlockOptions } from "../code-block";
import { parseCodeFenceMeta } from "../code-block/fence-meta";
import { MermaidPluginView } from "../mermaid";

export const CodeBlockView: Component = () => {
  const vm = useVelomark();
  const { block, index } = useBlock();
  const data = () => block.data as CodeBlockData;
  const language = () => data().language?.trim() || undefined;
  const customRenderer = () => (language() ? vm.codeBlockRenderers?.[language() ?? ""] : undefined);
  const resolvedCustomRenderer = customRenderer();

  if (resolvedCustomRenderer) {
    return <Dynamic code={data().code} component={resolvedCustomRenderer} language={language()} />;
  }

  const mermaidPlugin = () => vm.plugins.mermaid;

  if (language() === "mermaid" && mermaidPlugin()) {
    console.log("[CodeBlockView] mermaid block", {
      status: block.status,
      codeLen: data().code.length,
      first50: data().code.slice(0, 50),
    });
    return (
      <MermaidPluginView
        block={block as RenderBlock<CodeBlockData>}
        debug={vm.debug}
        index={index}
        plugin={mermaidPlugin() as NonNullable<ReturnType<typeof mermaidPlugin>>}
      />
    );
  }

  const effectiveLineNumbers = () => vm.codeBlockOptions?.lineNumbers ?? vm.lineNumbers;
  const options = () =>
    resolveCodeBlockOptions(
      effectiveLineNumbers() !== undefined
        ? { ...vm.codeBlockOptions, lineNumbers: effectiveLineNumbers() }
        : vm.codeBlockOptions,
    );
  const codePlugin = () => vm.plugins.code;
  const fenceMeta = () => parseCodeFenceMeta(data().meta);
  const showLineNumbers = () => options().lineNumbers && fenceMeta().lineNumbers;

  return (
    <CodeBlock
      code={data().code}
      copyButton={options().copyButton}
      data-velomark-block-id={vm.debug ? block.id : undefined}
      data-velomark-block-index={index}
      data-velomark-block-kind={block.kind}
      data-velomark-incomplete={block.status === "streaming" ? "" : undefined}
      highlight={options().highlight}
      language={language()}
      languageLabel={options().languageLabel}
      codePlugin={codePlugin() ?? undefined}
      isIncomplete={block.status === "streaming"}
      lineNumbers={showLineNumbers()}
      startLine={fenceMeta().startLine}
    />
  );
};
