import type { RenderBlock } from "../types";

export type DraftRenderBlock<TData = unknown> = Omit<RenderBlock<TData>, "id">;

function buildDeterministicId<TData>(block: DraftRenderBlock<TData>): string {
  return [block.kind, block.sourceStart, block.sourceEnd, block.fingerprint].join(
    ":"
  );
}

function isStableMatch<TData>(
  previous: RenderBlock<TData> | undefined,
  next: DraftRenderBlock<TData>
): previous is RenderBlock<TData> {
  return Boolean(
    previous &&
      previous.kind === next.kind &&
      previous.sourceStart === next.sourceStart &&
      previous.sourceEnd === next.sourceEnd &&
      previous.fingerprint === next.fingerprint
  );
}

export function assignStableBlockIds<TData>(
  previousBlocks: RenderBlock<TData>[],
  nextBlocks: DraftRenderBlock<TData>[]
): RenderBlock<TData>[] {
  return nextBlocks.map((nextBlock, index) => {
    const previousBlock = previousBlocks[index];

    if (isStableMatch(previousBlock, nextBlock)) {
      return {
        ...nextBlock,
        id: previousBlock.id,
      };
    }

    return {
      ...nextBlock,
      id: buildDeterministicId(nextBlock),
    };
  });
}
