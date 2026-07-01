import { type JSX, createContext, createMemo, useContext } from "solid-js";
import type { ParsedBlockData } from "./parser/block-boundaries";
import type { RenderBlock, RenderBlockStatus } from "../types";
import { useVelomark } from "./velomark-context";

export interface BlockStore {
  block: RenderBlock<ParsedBlockData>;
  id: string;
  index: number;
  status: RenderBlockStatus;
  isStreaming: boolean;
  isCodeFenceIncomplete: boolean;
}

const BlockContext = createContext<() => BlockStore>();

export function useBlock(): BlockStore {
  const accessor = useContext(BlockContext);
  if (!accessor) throw new Error("useBlock must be used within a BlockProvider");
  return accessor();
}

export function BlockProvider(props: {
  block?: RenderBlock<ParsedBlockData>;
  blockId: string;
  index: number;
  children: JSX.Element;
}) {
  const vm = useVelomark();

  const block = createMemo(() => {
    if (props.block) return props.block;
    const resolved = vm.document.blocks.find((b) => b.id === props.blockId);
    if (!resolved) throw new Error(`Missing block for id ${props.blockId}`);
    return resolved;
  });

  const accessor = (): BlockStore => ({
    get block() {
      return block();
    },
    get id() {
      return props.blockId;
    },
    get index() {
      return props.index;
    },
    get status() {
      return block().status;
    },
    get isStreaming() {
      return block().status === "streaming";
    },
    get isCodeFenceIncomplete() {
      return block().status === "streaming" && vm.docHasIncomplete;
    },
  });

  return <BlockContext.Provider value={accessor}>{props.children}</BlockContext.Provider>;
}

export { BlockContext };
