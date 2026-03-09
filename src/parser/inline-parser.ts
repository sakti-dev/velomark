import type { InlineToken } from "../types";

const ESCAPABLE_CHARACTERS = new Set(["\\", "*", "`", "[", "]", "(", ")"]);

function appendText(tokens: InlineToken[], text: string): void {
  if (!text) {
    return;
  }
  const previous = tokens.at(-1);
  if (previous?.type === "text") {
    previous.text += text;
    return;
  }
  tokens.push({ type: "text", text });
}

function parseDelimited(
  source: string,
  start: number,
  delimiter: string
): { content: string; end: number } | null {
  const end = source.indexOf(delimiter, start + delimiter.length);
  if (end === -1) {
    return null;
  }
  return {
    content: source.slice(start + delimiter.length, end),
    end: end + delimiter.length,
  };
}

function parseLink(source: string, start: number) {
  const labelEnd = source.indexOf("]", start + 1);
  if (labelEnd === -1 || source[labelEnd + 1] !== "(") {
    return null;
  }
  const hrefEnd = source.indexOf(")", labelEnd + 2);
  if (hrefEnd === -1) {
    return null;
  }
  return {
    label: source.slice(start + 1, labelEnd),
    href: source.slice(labelEnd + 2, hrefEnd),
    end: hrefEnd + 1,
  };
}

export function parseInline(source: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let index = 0;

  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];

    if (current === "\\") {
      const escaped = next;
      if (escaped && ESCAPABLE_CHARACTERS.has(escaped)) {
        appendText(tokens, escaped);
        index += 2;
        continue;
      }
      appendText(tokens, current);
      index += 1;
      continue;
    }

    if (current === "`") {
      const parsed = parseDelimited(source, index, "`");
      if (parsed) {
        tokens.push({ type: "code", text: parsed.content });
        index = parsed.end;
        continue;
      }
    }

    if (current === "*" && next === "*") {
      const parsed = parseDelimited(source, index, "**");
      if (parsed) {
        tokens.push({
          type: "strong",
          children: parseInline(parsed.content),
        });
        index = parsed.end;
        continue;
      }
    }

    if (current === "*") {
      const parsed = parseDelimited(source, index, "*");
      if (parsed) {
        tokens.push({
          type: "emphasis",
          children: parseInline(parsed.content),
        });
        index = parsed.end;
        continue;
      }
    }

    if (current === "[") {
      const parsed = parseLink(source, index);
      if (parsed) {
        tokens.push({
          type: "link",
          href: parsed.href,
          children: parseInline(parsed.label),
        });
        index = parsed.end;
        continue;
      }
    }

    appendText(tokens, current ?? "");
    index += 1;
  }

  return tokens;
}
