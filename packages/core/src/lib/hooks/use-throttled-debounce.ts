import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";

export function useThrottledDebounce<T>(
  value: Accessor<T>,
  throttleMs = 200,
  debounceMs = 50,
): Accessor<T> {
  const [processedValue, setProcessedValue] = createSignal(value());
  let lastRunTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  createEffect(() => {
    const currentValue = value();
    const now = Date.now();
    const timeSinceLastRun = now - lastRunTime;

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    if (timeSinceLastRun >= throttleMs) {
      setProcessedValue(() => currentValue);
      lastRunTime = now;
    } else {
      timeoutId = setTimeout(() => {
        setProcessedValue(() => currentValue);
        lastRunTime = Date.now();
      }, debounceMs);
    }
  });

  onCleanup(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  });

  return processedValue;
}
