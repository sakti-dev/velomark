import { createContext, useContext } from "solid-js";

/**
 * Stores an accessor (not a plain boolean) because Solid's Context Provider
 * sets `Owner.context[id]` inside `untrack()` — the value is captured once
 * and never updates reactively. By storing `() => boolean`, the consumer
 * calls the accessor inside its own reactive scope, which properly tracks
 * the underlying signals (block status, docHasIncomplete).
 */
const BlockIncompleteContext = createContext<() => boolean>(() => false);

export const useIsCodeFenceIncomplete = (): boolean => useContext(BlockIncompleteContext)();

export { BlockIncompleteContext };
