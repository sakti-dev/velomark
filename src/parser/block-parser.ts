import { parseBlockBoundaries, type ParsedBlockData } from "./block-boundaries";
import type { DraftRenderBlock } from "../model/stable-id";
import type { ReferenceDefinitionMap } from "../types";

const REFERENCE_DEFINITION_RE =
  /^\[([^\]]+)\]:\s+(\S+?)(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?\s*$/;

function normalizeReferenceId(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export function extractReferenceDefinitions(markdown: string): {
  content: string;
  definitions: ReferenceDefinitionMap;
} {
  const definitions: ReferenceDefinitionMap = {};
  const keptLines: string[] = [];

  for (const line of markdown.split("\n")) {
    const match = line.match(REFERENCE_DEFINITION_RE);
    if (!match) {
      keptLines.push(line);
      continue;
    }

    const identifier = match[1];
    const href = match[2];
    if (!(identifier && href)) {
      keptLines.push(line);
      continue;
    }

    const title = match[3] ?? match[4] ?? match[5];
    definitions[normalizeReferenceId(identifier)] = title ? { href, title } : { href };
  }

  return {
    content: keptLines.join("\n"),
    definitions,
  };
}

export function parseMarkdownToBlocks(markdown: string): {
  blocks: DraftRenderBlock<ParsedBlockData>[];
  definitions: ReferenceDefinitionMap;
} {
  const { content, definitions } = extractReferenceDefinitions(markdown);
  return {
    blocks: parseBlockBoundaries(content),
    definitions,
  };
}
