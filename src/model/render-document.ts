import { assignStableBlockIds } from "./stable-id";
import {
  type ParagraphBlockData,
  parseBlockBoundaries,
} from "../parser/block-boundaries";
import type { RenderBlock, RenderDocument } from "../types";

function canReuseBlock<TData>(
  previous: RenderBlock<TData> | undefined,
  next: RenderBlock<TData>
): previous is RenderBlock<TData> {
  return Boolean(
    previous &&
      previous.id === next.id &&
      previous.kind === next.kind &&
      previous.sourceStart === next.sourceStart &&
      previous.sourceEnd === next.sourceEnd &&
      previous.fingerprint === next.fingerprint
  );
}

export function buildRenderDocument(
  previousDocument: RenderDocument<ParagraphBlockData> | undefined,
  markdown: string
): RenderDocument<ParagraphBlockData> {
  const previousBlocks = previousDocument?.blocks ?? [];
  const draftBlocks = parseBlockBoundaries(markdown);
  const nextBlocksWithIds = assignStableBlockIds(previousBlocks, draftBlocks);
  const blocks = nextBlocksWithIds.map((block, index) => {
    const previousBlock = previousBlocks[index];
    return canReuseBlock(previousBlock, block) ? previousBlock : block;
  });

  return {
    blocks,
    version: (previousDocument?.version ?? 0) + 1,
  };
}
