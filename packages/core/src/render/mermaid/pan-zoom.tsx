import { type Component, type JSX, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { cn } from "cnfast";

import { useVelomark } from "../../lib/velomark-context";

export interface PanZoomProps {
  children?: JSX.Element;
  class?: string;
  fullscreen?: boolean;
  initialZoom?: number;
  maxZoom?: number;
  minZoom?: number;
  showControls?: boolean;
  zoomStep?: number;
}

export const PanZoom: Component<PanZoomProps> = (props) => {
  const minZoom = () => props.minZoom ?? 0.5;
  const maxZoom = () => props.maxZoom ?? 3;
  const zoomStep = () => props.zoomStep ?? 0.1;
  const initialZoom = () => props.initialZoom ?? 1;

  const [zoom, setZoom] = createSignal(initialZoom());
  const [pan, setPan] = createSignal({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = createSignal(false);
  let panStart = { x: 0, y: 0 };
  let panStartPosition = { x: 0, y: 0 };

  let containerRef: HTMLDivElement | undefined;

  const clampZoom = (value: number) => Math.max(minZoom(), Math.min(maxZoom(), value));

  const handleZoom = (delta: number) => {
    setZoom((prev) => clampZoom(prev + delta));
  };

  const handleZoomIn = () => handleZoom(zoomStep());
  const handleZoomOut = () => handleZoom(-zoomStep());
  const handleReset = () => {
    setZoom(initialZoom());
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    handleZoom(event.deltaY > 0 ? -zoomStep() : zoomStep());
  };

  onMount(() => {
    const container = containerRef;
    if (!container) {
      return;
    }
    container.addEventListener("wheel", handleWheel, { passive: false });
  });

  onCleanup(() => {
    containerRef?.removeEventListener("wheel", handleWheel);
  });

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || event.isPrimary === false) {
      return;
    }
    setIsPanning(true);
    panStart = { x: event.clientX, y: event.clientY };
    panStartPosition = pan();
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      target.setPointerCapture(event.pointerId);
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!isPanning()) {
      return;
    }
    event.preventDefault();
    setPan({
      x: panStartPosition.x + (event.clientX - panStart.x),
      y: panStartPosition.y + (event.clientY - panStart.y),
    });
  };

  const onPointerUp = (event: PointerEvent) => {
    setIsPanning(false);
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      target.releasePointerCapture(event.pointerId);
    }
  };

  const transform = createMemo(() => `translate(${pan().x}px, ${pan().y}px) scale(${zoom()})`);
  const cursor = () => (isPanning() ? "grabbing" : "grab");

  return (
    <div
      ref={(el) => {
        containerRef = el;
      }}
      class={cn(
        "relative flex flex-col",
        props.fullscreen ? "h-full w-full" : "min-h-28 w-full",
        props.class,
      )}
      style={{ cursor: cursor() }}
    >
      <ShowControls
        show={props.showControls}
        fullscreen={props.fullscreen}
        zoom={zoom()}
        minZoom={minZoom()}
        maxZoom={maxZoom()}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
      />
      <div
        class={cn(
          "flex-1 origin-center transition-transform duration-150 ease-out",
          props.fullscreen
            ? "flex h-full w-full items-center justify-center"
            : "flex w-full items-center justify-center",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="application"
        style={{
          transform: transform(),
          "transform-origin": "center center",
          "touch-action": "none",
          "will-change": "transform",
        }}
      >
        {props.children}
      </div>
    </div>
  );
};

const ShowControls: Component<{
  show?: boolean;
  fullscreen?: boolean;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}> = (props) => {
  const vm = useVelomark();
  if (!props.show) {
    return null;
  }
  return (
    <div
      class={cn(
        "absolute z-10 flex flex-col gap-1 rounded-md border border-border bg-background/80 p-1 supports-backdrop-filter:bg-background/70 supports-backdrop-filter:backdrop-blur-sm",
        props.fullscreen ? "bottom-4 left-4" : "bottom-2 left-2",
      )}
    >
      <button
        class="flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={props.zoom >= props.maxZoom}
        title={vm.t.zoomIn}
        type="button"
        onClick={() => props.onZoomIn()}
      >
        <vm.icons.ZoomInIcon size={16} />
      </button>
      <button
        class="flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={props.zoom <= props.minZoom}
        title={vm.t.zoomOut}
        type="button"
        onClick={() => props.onZoomOut()}
      >
        <vm.icons.ZoomOutIcon size={16} />
      </button>
      <button
        class="flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={vm.t.zoomReset}
        type="button"
        onClick={() => props.onReset()}
      >
        <vm.icons.RotateCcwIcon size={16} />
      </button>
    </div>
  );
};
