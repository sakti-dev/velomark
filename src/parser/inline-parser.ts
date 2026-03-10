import type { InlineToken, ReferenceDefinitionMap } from "../types";

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

function parseImage(source: string, start: number) {
  if (source[start] !== "!" || source[start + 1] !== "[") {
    return null;
  }
  const altEnd = source.indexOf("]", start + 2);
  if (altEnd === -1 || source[altEnd + 1] !== "(") {
    return null;
  }
  const srcEnd = source.indexOf(")", altEnd + 2);
  if (srcEnd === -1) {
    return null;
  }
  return {
    alt: source.slice(start + 2, altEnd),
    src: source.slice(altEnd + 2, srcEnd),
    end: srcEnd + 1,
  };
}

function normalizeReferenceId(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function parseReferenceLink(source: string, start: number) {
  const labelEnd = source.indexOf("]", start + 1);
  if (labelEnd === -1 || source[labelEnd + 1] !== "[") {
    return null;
  }
  const referenceEnd = source.indexOf("]", labelEnd + 2);
  if (referenceEnd === -1) {
    return null;
  }
  return {
    label: source.slice(start + 1, labelEnd),
    reference: source.slice(labelEnd + 2, referenceEnd),
    end: referenceEnd + 1,
  };
}

function parseShortcutReferenceLink(source: string, start: number) {
  const labelEnd = source.indexOf("]", start + 1);
  if (labelEnd === -1) {
    return null;
  }

  return {
    label: source.slice(start + 1, labelEnd),
    end: labelEnd + 1,
  };
}

function parseReferenceImage(source: string, start: number) {
  if (source[start] !== "!" || source[start + 1] !== "[") {
    return null;
  }
  const altEnd = source.indexOf("]", start + 2);
  if (altEnd === -1 || source[altEnd + 1] !== "[") {
    return null;
  }
  const referenceEnd = source.indexOf("]", altEnd + 2);
  if (referenceEnd === -1) {
    return null;
  }
  return {
    alt: source.slice(start + 2, altEnd),
    reference: source.slice(altEnd + 2, referenceEnd),
    end: referenceEnd + 1,
  };
}

function parseShortcutReferenceImage(source: string, start: number) {
  if (source[start] !== "!" || source[start + 1] !== "[") {
    return null;
  }
  const altEnd = source.indexOf("]", start + 2);
  if (altEnd === -1) {
    return null;
  }
  return {
    alt: source.slice(start + 2, altEnd),
    end: altEnd + 1,
  };
}

function parseFootnoteReference(source: string, start: number) {
  if (source[start] !== "[" || source[start + 1] !== "^") {
    return null;
  }
  const referenceEnd = source.indexOf("]", start + 2);
  if (referenceEnd === -1) {
    return null;
  }
  return {
    identifier: source.slice(start + 2, referenceEnd),
    end: referenceEnd + 1,
  };
}

function parseInlineMath(source: string, start: number) {
  if (source[start] !== "$" || source[start + 1] === "$") {
    return null;
  }
  const end = source.indexOf("$", start + 1);
  if (end === -1 || end === start + 1) {
    return null;
  }
  return {
    value: source.slice(start + 1, end),
    end: end + 1,
  };
}

export function parseInline(
  source: string,
  definitions: ReferenceDefinitionMap = {}
): InlineToken[] {
  const tokens: InlineToken[] = [];
  let index = 0;

  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];
    const nextNext = source[index + 2];

    if (current === " " && next === " " && nextNext === "\n") {
      tokens.push({ type: "break" });
      index += 3;
      continue;
    }

    if (current === "\\" && next === "\n") {
      tokens.push({ type: "break" });
      index += 2;
      continue;
    }

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

    if (current === "$") {
      const parsed = parseInlineMath(source, index);
      if (parsed) {
        tokens.push({ type: "inline-math", value: parsed.value });
        index = parsed.end;
        continue;
      }
    }

    if (current === "~" && next === "~") {
      const parsed = parseDelimited(source, index, "~~");
      if (parsed) {
        tokens.push({
          type: "delete",
          children: parseInline(parsed.content, definitions),
        });
        index = parsed.end;
        continue;
      }
    }

    if (current === "*" && next === "*") {
      const parsed = parseDelimited(source, index, "**");
      if (parsed) {
        tokens.push({
          type: "strong",
          children: parseInline(parsed.content, definitions),
        });
        index = parsed.end;
        continue;
      }
    }

    if (current === "_" && next === "_") {
      const parsed = parseDelimited(source, index, "__");
      if (parsed) {
        tokens.push({
          type: "strong",
          children: parseInline(parsed.content, definitions),
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
          children: parseInline(parsed.content, definitions),
        });
        index = parsed.end;
        continue;
      }
    }

    if (current === "_") {
      const parsed = parseDelimited(source, index, "_");
      if (parsed) {
        tokens.push({
          type: "emphasis",
          children: parseInline(parsed.content, definitions),
        });
        index = parsed.end;
        continue;
      }
    }

    if (current === "[") {
      const footnoteParsed = parseFootnoteReference(source, index);
      if (footnoteParsed) {
        tokens.push({
          type: "footnote-reference",
          identifier: footnoteParsed.identifier,
        });
        index = footnoteParsed.end;
        continue;
      }

      const referenceParsed = parseReferenceLink(source, index);
      if (referenceParsed) {
        const referenceId = normalizeReferenceId(
          referenceParsed.reference || referenceParsed.label
        );
        const definition = definitions[referenceId];
        if (definition) {
          tokens.push({
            type: "link",
            href: definition.href,
            title: definition.title,
            children: parseInline(referenceParsed.label, definitions),
          });
          index = referenceParsed.end;
          continue;
        }
      }

      const shortcutParsed = parseShortcutReferenceLink(source, index);
      if (shortcutParsed && source[shortcutParsed.end] !== "(") {
        const definition =
          definitions[normalizeReferenceId(shortcutParsed.label)];
        if (definition) {
          tokens.push({
            type: "link",
            href: definition.href,
            title: definition.title,
            children: parseInline(shortcutParsed.label, definitions),
          });
          index = shortcutParsed.end;
          continue;
        }
      }

      const parsed = parseLink(source, index);
      if (parsed) {
        tokens.push({
          type: "link",
          href: parsed.href,
          children: parseInline(parsed.label, definitions),
        });
        index = parsed.end;
        continue;
      }
    }

    if (current === "!") {
      const referenceParsed = parseReferenceImage(source, index);
      if (referenceParsed) {
        const referenceId = normalizeReferenceId(
          referenceParsed.reference || referenceParsed.alt
        );
        const definition = definitions[referenceId];
        if (definition) {
          tokens.push({
            type: "image",
            alt: referenceParsed.alt,
            src: definition.href,
            title: definition.title,
          });
          index = referenceParsed.end;
          continue;
        }
      }

      const shortcutParsed = parseShortcutReferenceImage(source, index);
      if (shortcutParsed && source[shortcutParsed.end] !== "(") {
        const definition = definitions[normalizeReferenceId(shortcutParsed.alt)];
        if (definition) {
          tokens.push({
            type: "image",
            alt: shortcutParsed.alt,
            src: definition.href,
            title: definition.title,
          });
          index = shortcutParsed.end;
          continue;
        }
      }

      const parsed = parseImage(source, index);
      if (parsed) {
        tokens.push({
          type: "image",
          alt: parsed.alt,
          src: parsed.src,
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
