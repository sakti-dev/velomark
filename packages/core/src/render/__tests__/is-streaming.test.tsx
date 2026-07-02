import { createEffect, createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { Velomark } from "../velomark";
import { useVelomark } from "../../lib/velomark-context";

const mountedRoots: Array<() => void> = [];

afterEach(() => {
  while (mountedRoots.length > 0) {
    mountedRoots.pop()?.();
  }
  document.body.innerHTML = "";
});

function ContextProbe(props: {
  onStreaming?: (v: boolean) => void;
  onIncomplete?: (v: boolean) => void;
}) {
  const vm = useVelomark();
  createEffect(() => props.onStreaming?.(vm.isStreaming()));
  createEffect(() => props.onIncomplete?.(vm.docHasIncomplete));
  return <></>;
}

describe("isStreaming context", () => {
  it("exposes true for complete markdown (last block always streaming)", () => {
    const host = document.createElement("div");
    document.body.append(host);
    let streamingValue: boolean | undefined;

    const dispose = render(
      () => (
        <Velomark markdown={"Hello world"}>
          <ContextProbe onStreaming={(v) => (streamingValue = v)} />
        </Velomark>
      ),
      host,
    );
    mountedRoots.push(dispose);

    expect(streamingValue).toBe(true);
  });

  it("exposes true for markdown with unclosed code fence", () => {
    const host = document.createElement("div");
    document.body.append(host);
    let streamingValue: boolean | undefined;

    const dispose = render(
      () => (
        <Velomark markdown={"```js\nconst x = 1"}>
          <ContextProbe onStreaming={(v) => (streamingValue = v)} />
        </Velomark>
      ),
      host,
    );
    mountedRoots.push(dispose);

    expect(streamingValue).toBe(true);
  });
});

describe("hasIncomplete context", () => {
  it("exposes false for complete markdown (no unclosed syntax)", () => {
    const host = document.createElement("div");
    document.body.append(host);
    let incomplete: boolean | undefined;

    const dispose = render(
      () => (
        <Velomark markdown={"Hello world"}>
          <ContextProbe onIncomplete={(v) => (incomplete = v)} />
        </Velomark>
      ),
      host,
    );
    mountedRoots.push(dispose);

    expect(incomplete).toBe(false);
  });

  it("exposes true for unclosed code fence", () => {
    const host = document.createElement("div");
    document.body.append(host);
    let incomplete: boolean | undefined;

    const dispose = render(
      () => (
        <Velomark markdown={"```js\nconst x = 1"}>
          <ContextProbe onIncomplete={(v) => (incomplete = v)} />
        </Velomark>
      ),
      host,
    );
    mountedRoots.push(dispose);

    expect(incomplete).toBe(true);
  });

  it("exposes false when fence is closed", () => {
    const host = document.createElement("div");
    document.body.append(host);
    let incomplete: boolean | undefined;

    const dispose = render(
      () => (
        <Velomark markdown={"```js\nconst x = 1\n```"}>
          <ContextProbe onIncomplete={(v) => (incomplete = v)} />
        </Velomark>
      ),
      host,
    );
    mountedRoots.push(dispose);

    expect(incomplete).toBe(false);
  });

  it("transitions from true to false when fence closes", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const [md, setMd] = createSignal("```js\nconst x = 1");
    const values: boolean[] = [];

    const dispose = render(
      () => (
        <Velomark markdown={md()}>
          <ContextProbe onIncomplete={(v) => values.push(v)} />
        </Velomark>
      ),
      host,
    );
    mountedRoots.push(dispose);

    expect(values[values.length - 1]).toBe(true);

    setMd("```js\nconst x = 1\n```");
    await new Promise((r) => setTimeout(r, 10));

    expect(values[values.length - 1]).toBe(false);
  });
});

describe("onAnimationStart / onAnimationEnd callbacks", () => {
  it("fires onAnimationStart when incomplete begins and onAnimationEnd when it completes", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const [md, setMd] = createSignal("");
    const onStart = vi.fn();
    const onEnd = vi.fn();

    const dispose = render(
      () => <Velomark markdown={md()} onAnimationStart={onStart} onAnimationEnd={onEnd} />,
      host,
    );
    mountedRoots.push(dispose);

    await new Promise((r) => setTimeout(r, 10));
    expect(onStart).not.toHaveBeenCalled();

    setMd("```js\nconst x");
    await new Promise((r) => setTimeout(r, 10));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();

    setMd("```js\nconst x = 1\n```");
    await new Promise((r) => setTimeout(r, 10));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("does not fire duplicate callbacks when content grows while incomplete", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const [md, setMd] = createSignal("```js\nconst x");
    const onStart = vi.fn();
    const onEnd = vi.fn();

    const dispose = render(
      () => <Velomark markdown={md()} onAnimationStart={onStart} onAnimationEnd={onEnd} />,
      host,
    );
    mountedRoots.push(dispose);

    await new Promise((r) => setTimeout(r, 10));
    expect(onStart).toHaveBeenCalledTimes(1);

    setMd("```js\nconst x = 1;\nconst y");
    await new Promise((r) => setTimeout(r, 10));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();
  });
});
