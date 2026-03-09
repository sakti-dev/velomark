import { assignStableBlockIds } from "./stable-id";
import {
  type ParsedBlockData,
} from "../parser/block-boundaries";
import { parseMarkdownToBlocks } from "../parser/block-parser";
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
  previousDocument: RenderDocument<ParsedBlockData> | undefined,
  markdown: string
): RenderDocument<ParsedBlockData> {
  const previousBlocks = previousDocument?.blocks ?? [];
  const draftBlocks = parseMarkdownToBlocks(markdown);
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
