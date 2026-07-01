import { type Accessor, createSignal, onCleanup, onMount } from "solid-js";

export const DEFERRED_RENDER_DEBOUNCE_DELAY = 300;
export const DEFERRED_RENDER_ROOT_MARGIN = "300px";
export const DEFERRED_RENDER_IDLE_TIMEOUT = 500;

export interface UseDeferredRenderOptions {
  debounceDelay?: number;
  idleTimeout?: number;
  immediate?: boolean;
  rootMargin?: string;
}

export interface UseDeferredRenderReturn {
  shouldRender: Accessor<boolean>;
  ref: (el: HTMLDivElement) => void;
}

export function useDeferredRender(options: UseDeferredRenderOptions = {}): UseDeferredRenderReturn {
  const {
    immediate = false,
    debounceDelay = DEFERRED_RENDER_DEBOUNCE_DELAY,
    rootMargin = DEFERRED_RENDER_ROOT_MARGIN,
    idleTimeout = DEFERRED_RENDER_IDLE_TIMEOUT,
  } = options;

  const [shouldRender, setShouldRender] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;
  let renderTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let idleCallbackId: number | undefined;

  const ref = (el: HTMLDivElement): void => {
    containerRef = el;
  };

  const requestIdleCallbackWrapper =
    typeof window !== "undefined" && window.requestIdleCallback
      ? (cb: IdleRequestCallback, opts?: IdleRequestOptions) => window.requestIdleCallback(cb, opts)
      : (cb: IdleRequestCallback): number => {
          const start = Date.now();
          return window.setTimeout(() => {
            cb({ didTimeout: false, timeRemaining: () => Math.max(0, 50 - (Date.now() - start)) });
          }, 1) as unknown as number;
        };

  const cancelIdleCallbackWrapper =
    typeof window !== "undefined" && window.cancelIdleCallback
      ? (id: number) => window.cancelIdleCallback(id)
      : (id: number) => clearTimeout(id);

  const clearPendingRenders = (): void => {
    if (renderTimeoutId !== undefined) {
      clearTimeout(renderTimeoutId);
      renderTimeoutId = undefined;
    }
    if (idleCallbackId !== undefined) {
      cancelIdleCallbackWrapper(idleCallbackId);
      idleCallbackId = undefined;
    }
  };

  const scheduleRender = (obs: IntersectionObserver): void => {
    idleCallbackId = requestIdleCallbackWrapper(
      (deadline) => {
        if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
          setShouldRender(true);
          obs.disconnect();
        } else {
          idleCallbackId = requestIdleCallbackWrapper(
            () => {
              setShouldRender(true);
              obs.disconnect();
            },
            { timeout: idleTimeout / 2 },
          );
        }
      },
      { timeout: idleTimeout },
    );
  };

  onMount(() => {
    if (immediate) {
      setShouldRender(true);
      return;
    }
    const container = containerRef;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            clearPendingRenders();
            renderTimeoutId = setTimeout(() => {
              const records = observer.takeRecords();
              const isStillInView =
                records.length === 0 || (records.at(-1)?.isIntersecting ?? false);
              if (isStillInView) {
                scheduleRender(observer);
              }
            }, debounceDelay);
          } else {
            clearPendingRenders();
          }
        }
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(container);

    onCleanup(() => {
      clearPendingRenders();
      observer.disconnect();
    });
  });

  return { shouldRender, ref };
}
