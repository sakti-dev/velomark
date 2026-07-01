const WHITESPACE_RE = /\s/;
const WHITESPACE_ONLY_RE = /^\s+$/;

export const splitIntoWords = (text: string): string[] => {
  const parts: string[] = [];
  let current = "";
  let inWhitespace = false;

  for (const char of text) {
    const isWs = WHITESPACE_RE.test(char);
    if (isWs !== inWhitespace && current) {
      parts.push(current);
      current = "";
    }
    current += char;
    inWhitespace = isWs;
  }

  if (current) {
    parts.push(current);
  }

  return parts;
};

export const splitIntoChars = (text: string): string[] => {
  const parts: string[] = [];
  let wsBuffer = "";

  for (const char of text) {
    if (WHITESPACE_RE.test(char)) {
      wsBuffer += char;
    } else {
      if (wsBuffer) {
        parts.push(wsBuffer);
        wsBuffer = "";
      }
      parts.push(char);
    }
  }

  if (wsBuffer) {
    parts.push(wsBuffer);
  }

  return parts;
};

export const isWhitespaceOnly = (text: string): boolean => WHITESPACE_ONLY_RE.test(text);
