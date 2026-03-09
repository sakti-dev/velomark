import type { RenderBlock } from "../types";
import type { DraftRenderBlock } from "../model/stable-id";
import {
  isBlankLine,
  isTableSeparator,
  isThematicBreak,
  looksLikeTableRow,
  matchBlockquote,
  matchFence,
  matchHeading,
  matchOrderedList,
  matchUnorderedList,
} from "./context";

export interface ParagraphBlockData {
  text: string;
}

export interface HeadingBlockData {
  depth: number;
  text: string;
}

export interface BlockquoteBlockData {
  text: string;
}

export interface ListBlockData {
  items: string[];
  ordered: boolean;
}

export interface CodeBlockData {
  code: string;
  language?: string;
}

export interface ThematicBreakBlockData {}

export interface TableBlockData {
  rows: string[][];
}

export type ParsedBlockData =
  | ParagraphBlockData
  | HeadingBlockData
  | BlockquoteBlockData
  | ListBlockData
  | CodeBlockData
  | ThematicBreakBlockData
  | TableBlockData;

type ParsedDraftBlock = DraftRenderBlock<ParsedBlockData>;

interface LineInfo {
  end: number;
  start: number;
  text: string;
}

function buildLineInfos(markdown: string): LineInfo[] {
  const lines: LineInfo[] = [];
  let start = 0;

  while (start <= markdown.length) {
    const nextNewline = markdown.indexOf("\n", start);
    const end = nextNewline === -1 ? markdown.length : nextNewline;
    lines.push({
      start,
      end,
      text: markdown.slice(start, end),
    });
    if (nextNewline === -1) {
      break;
    }
    start = nextNewline + 1;
  }

  return lines;
}

function buildBlock<TData extends ParsedBlockData>(
  kind: ParsedDraftBlock["kind"],
  sourceStart: number,
  sourceEnd: number,
  atDocumentEnd: boolean,
  fingerprint: string,
  data: TData
): DraftRenderBlock<TData> {
  return {
    kind,
    sourceStart,
    sourceEnd,
    status: atDocumentEnd ? "streaming" : "complete",
    fingerprint,
    data,
  };
}

export function parseBlockBoundaries(
  markdown: string
): DraftRenderBlock<ParsedBlockData>[] {
  const blocks: ParsedDraftBlock[] = [];
  const lines = buildLineInfos(markdown);
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    if (!line) {
      break;
    }

    if (isBlankLine(line.text)) {
      lineIndex += 1;
      continue;
    }

    const headingMatch = matchHeading(line.text);
    if (headingMatch) {
      blocks.push(
        buildBlock(
          "heading",
          line.start,
          line.end,
          lineIndex === lines.length - 1,
          `heading:${headingMatch[1]?.length ?? 0}:${headingMatch[2] ?? ""}`,
          {
            depth: headingMatch[1]?.length ?? 1,
            text: headingMatch[2] ?? "",
          }
        )
      );
      lineIndex += 1;
      continue;
    }

    const fenceMatch = matchFence(line.text);
    if (fenceMatch) {
      const sourceStart = line.start;
      const language = fenceMatch[1] || undefined;
      const codeLines: string[] = [];
      let scanIndex = lineIndex + 1;
      let sourceEnd = markdown.length;
      let closed = false;

      while (scanIndex < lines.length) {
        const scanLine = lines[scanIndex];
        if (!scanLine) {
          break;
        }
        if (matchFence(scanLine.text)) {
          sourceEnd = scanLine.end;
          closed = true;
          scanIndex += 1;
          break;
        }
        codeLines.push(scanLine.text);
        sourceEnd = scanLine.end;
        scanIndex += 1;
      }

      blocks.push({
        kind: "code",
        sourceStart,
        sourceEnd,
        status: closed ? "complete" : "streaming",
        fingerprint: `code:${language ?? ""}:${codeLines.join("\n")}`,
        data: {
          language,
          code: codeLines.join("\n"),
        },
      });
      lineIndex = scanIndex;
      continue;
    }

    const blockquoteMatch = matchBlockquote(line.text);
    if (blockquoteMatch) {
      const sourceStart = line.start;
      const quoteLines: string[] = [];
      let scanIndex = lineIndex;
      let sourceEnd = line.end;

      while (scanIndex < lines.length) {
        const scanLine = lines[scanIndex];
        if (!scanLine) {
          break;
        }
        const match = matchBlockquote(scanLine.text);
        if (!match) {
          break;
        }
        quoteLines.push(match[1] ?? "");
        sourceEnd = scanLine.end;
        scanIndex += 1;
      }

      const text = quoteLines.join("\n");
      blocks.push(
        buildBlock(
          "blockquote",
          sourceStart,
          sourceEnd,
          scanIndex >= lines.length,
          `blockquote:${text}`,
          { text }
        )
      );
      lineIndex = scanIndex;
      continue;
    }

    const orderedListMatch = matchOrderedList(line.text);
    const unorderedListMatch = matchUnorderedList(line.text);
    if (orderedListMatch || unorderedListMatch) {
      const ordered = Boolean(orderedListMatch);
      const sourceStart = line.start;
      const items: string[] = [];
      let scanIndex = lineIndex;
      let sourceEnd = line.end;

      while (scanIndex < lines.length) {
        const scanLine = lines[scanIndex];
        if (!scanLine) {
          break;
        }
        const orderedMatch = matchOrderedList(scanLine.text);
        const unorderedMatch = matchUnorderedList(scanLine.text);
        const match = ordered ? orderedMatch : unorderedMatch;
        if (!match) {
          break;
        }
        items.push(match[1] ?? "");
        sourceEnd = scanLine.end;
        scanIndex += 1;
      }

      blocks.push(
        buildBlock(
          "list",
          sourceStart,
          sourceEnd,
          scanIndex >= lines.length,
          `list:${ordered ? "ordered" : "unordered"}:${items.join("|")}`,
          { ordered, items }
        )
      );
      lineIndex = scanIndex;
      continue;
    }

    if (isThematicBreak(line.text)) {
      blocks.push(
        buildBlock(
          "thematic-break",
          line.start,
          line.end,
          lineIndex === lines.length - 1,
          "thematic-break",
          {}
        )
      );
      lineIndex += 1;
      continue;
    }

    const nextLine = lines[lineIndex + 1];
    if (
      nextLine &&
      looksLikeTableRow(line.text) &&
      isTableSeparator(nextLine.text)
    ) {
      const sourceStart = line.start;
      const rows: string[][] = [
        line.text
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell) => cell.length > 0),
      ];
      let scanIndex = lineIndex + 2;
      let sourceEnd = nextLine.end;

      while (scanIndex < lines.length) {
        const scanLine = lines[scanIndex];
        if (!(scanLine && looksLikeTableRow(scanLine.text))) {
          break;
        }
        rows.push(
          scanLine.text
            .split("|")
            .map((cell) => cell.trim())
            .filter((cell) => cell.length > 0)
        );
        sourceEnd = scanLine.end;
        scanIndex += 1;
      }

      blocks.push(
        buildBlock(
          "table",
          sourceStart,
          sourceEnd,
          scanIndex >= lines.length,
          `table:${rows.map((row) => row.join("|")).join("||")}`,
          { rows }
        )
      );
      lineIndex = scanIndex;
      continue;
    }

    const sourceStart = line.start;
    const paragraphLines: string[] = [];
    let scanIndex = lineIndex;
    let sourceEnd = line.end;

    while (scanIndex < lines.length) {
      const scanLine = lines[scanIndex];
      if (!scanLine || isBlankLine(scanLine.text)) {
        break;
      }
      if (
        matchHeading(scanLine.text) ||
        matchFence(scanLine.text) ||
        matchBlockquote(scanLine.text) ||
        matchOrderedList(scanLine.text) ||
        matchUnorderedList(scanLine.text) ||
        isThematicBreak(scanLine.text)
      ) {
        if (scanIndex !== lineIndex) {
          break;
        }
      }
      const tableLookahead = lines[scanIndex + 1];
      if (
        scanIndex === lineIndex &&
        tableLookahead &&
        looksLikeTableRow(scanLine.text) &&
        isTableSeparator(tableLookahead.text)
      ) {
        break;
      }
      paragraphLines.push(scanLine.text.trim());
      sourceEnd = scanLine.end;
      scanIndex += 1;
    }

    const text = paragraphLines.join("\n");
    blocks.push(
      buildBlock(
        "paragraph",
        sourceStart,
        sourceEnd,
        scanIndex >= lines.length,
        `paragraph:${text}`,
        { text }
      )
    );
    lineIndex = scanIndex;
  }

  return blocks;
}

export type ParsedBlock = RenderBlock<ParsedBlockData>;
