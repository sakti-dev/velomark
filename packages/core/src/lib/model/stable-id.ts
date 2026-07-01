import type { CodeBlockData } from "../parser/block-boundaries";
import type { RenderBlock } from "../../types";

export type DraftRenderBlock<TData = unknown> = Omit<RenderBlock<TData>, "id">;

function hashString(input: string): string {
  let hash = 2_166_136_261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return (hash >>> 0).toString(36).padStart(8, "0").slice(0, 8);
}

function buildDeterministicId<TData>(block: DraftRenderBlock<TData>): string {
  return `b_${hashString(
    [block.kind, block.sourceStart, block.sourceEnd, block.fingerprint].join(":"),
  )}`;
}

function isStableMatch<TData>(
  previous: RenderBlock<TData> | undefined,
  next: DraftRenderBlock<TData>,
): previous is RenderBlock<TData> {
  return Boolean(
    previous &&
    previous.kind === next.kind &&
    previous.sourceStart === next.sourceStart &&
    previous.sourceEnd === next.sourceEnd &&
    previous.fingerprint === next.fingerprint,
  );
}

function isCodeGrowthMatch<TData>(
  previous: RenderBlock<TData> | undefined,
  next: DraftRenderBlock<TData>,
): previous is RenderBlock<TData> {
  if (previous?.kind !== "code" || next.kind !== "code") {
    return false;
  }

  const previousData = previous.data as CodeBlockData;
  const nextData = next.data as CodeBlockData;

  return (
    previous.sourceStart === next.sourceStart &&
    previousData.language === nextData.language &&
    nextData.code.startsWith(previousData.code)
  );
}

/**
 * Detects streaming growth in text-bearing blocks (paragraph, heading, etc.).
 * During streaming, the last block's text grows — sourceEnd and fingerprint
 * change, but it's still the same logical block. Preserving the ID prevents
 * <For> from remounting the entire subtree on every token.
 *
 * Only applies when the previous block was still streaming. Once a block is
 * complete, any content divergence is treated as a genuinely different block.
 */
function isStreamGrowthMatch<TData>(
  previous: RenderBlock<TData> | undefined,
  next: DraftRenderBlock<TData>,
): previous is RenderBlock<TData> {
  return Boolean(
    previous &&
    previous.kind === next.kind &&
    previous.sourceStart === next.sourceStart &&
    next.sourceEnd >= previous.sourceEnd &&
    previous.status === "streaming",
  );
}

export function assignStableBlockIds<TData>(
  previousBlocks: RenderBlock<TData>[],
  nextBlocks: DraftRenderBlock<TData>[],
): RenderBlock<TData>[] {
  return nextBlocks.map((nextBlock, index) => {
    const previousBlock = previousBlocks[index];

    const stable = isStableMatch(previousBlock, nextBlock);
    const codeGrowth = isCodeGrowthMatch(previousBlock, nextBlock);
    const streamGrowth = isStreamGrowthMatch(previousBlock, nextBlock);
    const matched = stable || codeGrowth || streamGrowth;
    const newId = matched ? previousBlock!.id : buildDeterministicId(nextBlock);

    return {
      ...nextBlock,
      id: newId,
    };
  });
}
