import { assignStableBlockIds } from "./stable-id";
import {
  type ParsedBlockData,
} from "../parser/block-boundaries";
import { parseMarkdownToBlocks } from "../parser/block-parser";
import type { DraftRenderBlock } from "./stable-id";
import type {
  RenderBlock,
  RenderDocument,
  VelomarkDebugMetrics,
} from "../types";

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
  const { blocks: draftBlocks, definitions } = parseMarkdownToBlocks(markdown);
  const nextBlocksWithIds = assignStableBlockIds(previousBlocks, draftBlocks);
  const blocks = nextBlocksWithIds.map((block, index) => {
    const previousBlock = previousBlocks[index];
    return canReuseBlock(previousBlock, block) ? previousBlock : block;
  });

  return {
    blocks,
    definitions,
    version: (previousDocument?.version ?? 0) + 1,
  };
}

export function collectRenderMetrics<TData>(
  previousBlocks: Array<DraftRenderBlock<TData> | RenderBlock<TData>>,
  nextBlocks: Array<DraftRenderBlock<TData> | RenderBlock<TData>>
): VelomarkDebugMetrics {
  let reusedBlockCount = 0;
  let appendedBlockCount = 0;
  let replacedBlockCount = 0;

  for (let index = 0; index < nextBlocks.length; index += 1) {
    const previousBlock = previousBlocks[index];
    const nextBlock = nextBlocks[index];

    if (!nextBlock) {
      continue;
    }

    if (
      previousBlock &&
      previousBlock.kind === nextBlock.kind &&
      previousBlock.sourceStart === nextBlock.sourceStart &&
      previousBlock.sourceEnd === nextBlock.sourceEnd &&
      previousBlock.fingerprint === nextBlock.fingerprint
    ) {
      reusedBlockCount += 1;
      continue;
    }

    if (!previousBlock) {
      appendedBlockCount += 1;
      continue;
    }

    replacedBlockCount += 1;
  }

  return {
    appendedBlockCount,
    blockCount: nextBlocks.length,
    replacedBlockCount,
    reusedBlockCount,
  };
}
