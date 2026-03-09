import { parseBlockBoundaries, type ParsedBlockData } from "./block-boundaries";
import type { DraftRenderBlock } from "../model/stable-id";

export function parseMarkdownToBlocks(
  markdown: string
): DraftRenderBlock<ParsedBlockData>[] {
  return parseBlockBoundaries(markdown);
}
