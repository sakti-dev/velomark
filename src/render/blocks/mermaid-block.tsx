import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  type Component,
} from "solid-js";
import { isServer } from "solid-js/web";
import type { Mermaid } from "mermaid";
import type { CodeBlockData } from "../../parser/block-boundaries";
import type { RenderBlock, VelomarkCodeBlockOptions } from "../../types";
import { DefaultCodeBlockShell } from "../code-blocks/default-code-block-shell";

let mermaidChartSequence = 0;

const nextChartId = (): string => {
  mermaidChartSequence += 1;
  return `velomark-mermaid-${mermaidChartSequence}`;
};

export const MermaidBlock: Component<{
  block: RenderBlock<CodeBlockData>;
  codeBlockOptions?: VelomarkCodeBlockOptions;
  debug?: boolean;
  index: number;
}> = (props) => {
  const [diagramSvg, setDiagramSvg] = createSignal<string>("");
  const [renderFailed, setRenderFailed] = createSignal<boolean>(false);
  const [mermaidInstance, setMermaidInstance] = createSignal<Mermaid | null>(
    null
  );
  let activeRenderToken = 0;

  const code = (): string => props.block.data.code;

  onMount(async () => {
    try {
      const { default: mermaid } = await import("mermaid");
      mermaid.initialize({
        securityLevel: "loose",
        startOnLoad: false,
        suppressErrorRendering: true,
      });
      setMermaidInstance(mermaid);
    } catch {
      setRenderFailed(true);
    }
  });

  createEffect(() => {
    const instance = mermaidInstance();
    const source = code();

    if (!instance || isServer || source.length === 0) {
      return;
    }

    const renderToken = activeRenderToken + 1;
    activeRenderToken = renderToken;
    setRenderFailed(false);

    void instance
      .render(nextChartId(), source)
      .then(({ svg }) => {
        if (activeRenderToken !== renderToken) {
          return;
        }
        setDiagramSvg(svg);
      })
      .catch(() => {
        if (activeRenderToken !== renderToken) {
          return;
        }
        setDiagramSvg("");
        setRenderFailed(true);
      });
  });

  onCleanup(() => {
    activeRenderToken += 1;
  });

  return (
    <div
      data-velomark-block-id={props.debug ? props.block.id : undefined}
      data-velomark-block-index={props.index}
      data-velomark-block-kind={props.block.kind}
      data-velomark-language="mermaid"
      data-velomark-mermaid=""
    >
      <DefaultCodeBlockShell
        code={code()}
        language="mermaid"
        options={props.codeBlockOptions}
        preview={
          !renderFailed() && diagramSvg().length > 0 ? (
            <div
              data-velomark-mermaid-diagram=""
              innerHTML={diagramSvg()}
            />
          ) : undefined
        }
        source={
          <pre>
            <code>{code()}</code>
          </pre>
        }
      />
    </div>
  );
};
