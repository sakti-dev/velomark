import { createContext, useContext } from "solid-js";

const BlockIncompleteContext = createContext<() => boolean>(() => false);

export const useIsCodeFenceIncomplete = (): boolean => useContext(BlockIncompleteContext)();

export { BlockIncompleteContext };
