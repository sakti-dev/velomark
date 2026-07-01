const START_LINE_RE = /startLine=(\d+)/;
const NO_LINE_NUMBERS_RE = /\bnoLineNumbers\b/;

export interface ParsedFenceMeta {
  lineNumbers: boolean;
  startLine: number;
}

export function parseCodeFenceMeta(meta: string | undefined): ParsedFenceMeta {
  if (!meta) {
    return { lineNumbers: true, startLine: 1 };
  }

  const startLineMatch = START_LINE_RE.exec(meta);
  const parsedStartLine = startLineMatch ? Number.parseInt(startLineMatch[1] ?? "", 10) : undefined;
  const startLine = parsedStartLine !== undefined && parsedStartLine >= 1 ? parsedStartLine : 1;

  return {
    lineNumbers: !NO_LINE_NUMBERS_RE.test(meta),
    startLine,
  };
}
