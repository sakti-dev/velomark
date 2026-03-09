import type { RenderBlock } from "../types";
import type { DraftRenderBlock } from "../model/stable-id";

export interface ParagraphBlockData {
  text: string;
}

export function parseBlockBoundaries(
  markdown: string
): DraftRenderBlock<ParagraphBlockData>[] {
  const blocks: DraftRenderBlock<ParagraphBlockData>[] = [];
  let index = 0;

  while (index < markdown.length) {
    while (
      index < markdown.length &&
      (markdown[index] === "\n" || markdown[index] === "\r")
    ) {
      index += 1;
    }

    if (index >= markdown.length) {
      break;
    }

    const sourceStart = index;
    let sourceEnd = markdown.length;
    const separatorMatch = /\n\s*\n/g;
    separatorMatch.lastIndex = index;
    const separator = separatorMatch.exec(markdown);
    if (separator) {
      sourceEnd = separator.index;
    }

    const raw = markdown.slice(sourceStart, sourceEnd);
    const text = raw.trim();
    if (text) {
      blocks.push({
        kind: "paragraph",
        sourceStart,
        sourceEnd,
        status: sourceEnd >= markdown.length ? "streaming" : "complete",
        fingerprint: `paragraph:${text}`,
        data: { text },
      });
    }

    index = sourceEnd + 2;
  }

  return blocks;
}

export type ParsedBlock = RenderBlock<ParagraphBlockData>;
