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
  matchOrderedListDetail,
  matchTaskListItem,
  matchUnorderedList,
  matchUnorderedListDetail,
} from "./context";

export interface ParagraphBlockData {
  text: string;
}

export interface HeadingBlockData {
  depth: number;
  text: string;
}

export interface BlockquoteBlockData {
  paragraphs: string[];
  text: string;
}

export interface ListItemData {
  children?: ListChildBlock[];
  checked?: boolean;
  text: string;
}

export interface ListChildBlock {
  data: ListBlockData;
  kind: "list";
}

export interface ListBlockData {
  items: ListItemData[];
  ordered: boolean;
}

export interface CodeBlockData {
  code: string;
  language?: string;
}

export interface ThematicBreakBlockData {}

export type TableColumnAlign = "center" | "left" | "right";

export interface TableBlockData {
  align: TableColumnAlign[];
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

function parseTableAlignments(separatorLine: string): TableColumnAlign[] {
  return separatorLine
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((segment) => {
      const trimmed = segment.trim();
      const startsWithColon = trimmed.startsWith(":");
      const endsWithColon = trimmed.endsWith(":");

      if (startsWithColon && endsWithColon) {
        return "center";
      }
      if (endsWithColon) {
        return "right";
      }
      return "left";
  });
}

function countLeadingSpaces(text: string): number {
  let count = 0;
  while (count < text.length && text[count] === " ") {
    count += 1;
  }
  return count;
}

function fingerprintListItems(items: ListItemData[]): string {
  return items
    .map((item) => {
      const taskPrefix =
        item.checked === undefined ? "" : `[${item.checked ? "x" : " "}]`;
      const childFingerprint = item.children
        ?.map((child) => `list(${fingerprintListItems(child.data.items)})`)
        .join(",");

      return childFingerprint
        ? `${taskPrefix}${item.text}{${childFingerprint}}`
        : `${taskPrefix}${item.text}`;
    })
    .join("|");
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

      const paragraphs: string[] = [];
      let currentParagraph: string[] = [];

      for (const quoteLine of quoteLines) {
        if (isBlankLine(quoteLine)) {
          if (currentParagraph.length > 0) {
            paragraphs.push(currentParagraph.join("\n"));
            currentParagraph = [];
          }
          continue;
        }
        currentParagraph.push(quoteLine);
      }

      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join("\n"));
      }

      const text = quoteLines.join("\n");
      blocks.push(
        buildBlock(
          "blockquote",
          sourceStart,
          sourceEnd,
          scanIndex >= lines.length,
          `blockquote:${text}`,
          {
            paragraphs,
            text,
          }
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
      const items: ListItemData[] = [];
      let scanIndex = lineIndex;
      let sourceEnd = line.end;
      const baseIndent = ordered
        ? (matchOrderedListDetail(line.text)?.indent ?? 0)
        : (matchUnorderedListDetail(line.text)?.indent ?? 0);

      while (scanIndex < lines.length) {
        const scanLine = lines[scanIndex];
        if (!scanLine) {
          break;
        }
        const orderedMatch = ordered
          ? matchOrderedListDetail(scanLine.text)
          : null;
        const unorderedMatch = ordered
          ? null
          : matchUnorderedListDetail(scanLine.text);
        const match = ordered ? orderedMatch : unorderedMatch;
        if (!match || match.indent !== baseIndent) {
          break;
        }
        const itemText = match.text;
        const taskItem = matchTaskListItem(itemText);
        const item: ListItemData = taskItem
          ? {
              checked: taskItem.checked,
              text: taskItem.text,
            }
          : {
              text: itemText,
            };
        scanIndex += 1;

        const childLines: string[] = [];
        let childSourceEnd = sourceEnd;
        while (scanIndex < lines.length) {
          const childLine = lines[scanIndex];
          if (!childLine) {
            break;
          }
          const childOrdered = matchOrderedListDetail(childLine.text);
          const childUnordered = matchUnorderedListDetail(childLine.text);
          const sameLevelMatch = ordered ? childOrdered : childUnordered;
          if (sameLevelMatch && sameLevelMatch.indent === baseIndent) {
            break;
          }
          const rawIndent = countLeadingSpaces(childLine.text);
          if (!isBlankLine(childLine.text) && rawIndent <= baseIndent) {
            break;
          }

          childLines.push(childLine.text.slice(Math.min(baseIndent + 2, childLine.text.length)));
          childSourceEnd = childLine.end;
          scanIndex += 1;
        }

        if (childLines.length > 0) {
          const childMarkdown = childLines.join("\n");
          const childBlocks = parseBlockBoundaries(childMarkdown);
          const nestedLists: ListChildBlock[] = [];
          for (const childBlock of childBlocks) {
            if (childBlock.kind !== "list") {
              continue;
            }
            nestedLists.push({
              kind: "list",
              data: childBlock.data as ListBlockData,
            });
          }
          if (nestedLists.length > 0) {
            item.children = nestedLists;
          }
        }

        items.push(item);
        sourceEnd = childLines.length > 0 ? childSourceEnd : scanLine.end;
      }

      blocks.push(
        buildBlock(
          "list",
          sourceStart,
          sourceEnd,
          scanIndex >= lines.length,
          `list:${ordered ? "ordered" : "unordered"}:${fingerprintListItems(items)}`,
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
      const align = parseTableAlignments(nextLine.text);
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
          {
            align,
            rows,
          }
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
