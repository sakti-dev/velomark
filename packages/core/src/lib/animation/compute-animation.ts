import type { AnimateOptions, InlineToken } from "../../types";
import { isWhitespaceOnly, splitIntoChars, splitIntoWords } from "./split-text";

export interface WordMeta {
  text: string;
  delay: number;
  duration: number;
  isWhitespace: boolean;
}

export interface AnimationConfig {
  animation: string;
  duration: number;
  easing: string;
  sep: "word" | "char";
  stagger: number;
}

export function resolveAnimationConfig(config: AnimateOptions): AnimationConfig {
  return {
    animation: config.animation ?? "fadeIn",
    duration: config.duration ?? 150,
    easing: config.easing ?? "ease",
    sep: config.sep ?? "word",
    stagger: config.stagger ?? 40,
  };
}

export interface AnimationResult {
  /** Map from token path → word metadata array. */
  entries: Map<string, WordMeta[]>;
  /** Total character count across all text tokens. */
  totalChars: number;
}

interface CharCounter {
  count: number;
  newIndex: number;
}

/**
 * Walks the inline token tree depth-first (matching render order) and assigns
 * animation metadata to each text token's words using a shared character
 * counter. Direct port of streamdown's `processTextNode` + `visitParents`.
 *
 * Path convention: top-level tokens use their index ("0", "1"). Children of
 * container tokens append ".index" ("1.0", "1.1"). This mirrors the basePath
 * threading in `RenderInlineTokens`.
 */
export function computeAnimation(
  tokens: InlineToken[],
  config: AnimationConfig,
  prevContentLength: number,
): AnimationResult {
  const entries = new Map<string, WordMeta[]>();
  const charCounter: CharCounter = { count: 0, newIndex: 0 };

  walk(tokens, "", config, prevContentLength, charCounter, entries);

  return { entries, totalChars: charCounter.count };
}

/**
 * Like `computeAnimation` but processes multiple token arrays in sequence
 * with a SINGLE shared character counter. Used for table blocks where every
 * cell must share the continuous stagger — matching streamdown's single
 * `visitParents` pass over the entire table HAST.
 */
export function computeAnimationMulti(
  inputs: { tokens: InlineToken[]; basePath: string }[],
  config: AnimationConfig,
  prevContentLength: number,
): AnimationResult {
  const entries = new Map<string, WordMeta[]>();
  const charCounter: CharCounter = { count: 0, newIndex: 0 };

  for (const input of inputs) {
    walk(input.tokens, input.basePath, config, prevContentLength, charCounter, entries);
  }

  return { entries, totalChars: charCounter.count };
}

function walk(
  tokens: InlineToken[],
  basePath: string,
  config: AnimationConfig,
  prevLen: number,
  charCounter: CharCounter,
  entries: Map<string, WordMeta[]>,
): void {
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) continue;
    const path = `${basePath}${i}`;

    switch (token.type) {
      case "text":
        processText(token.text, path, config, prevLen, charCounter, entries);
        break;
      case "emphasis":
      case "strong":
      case "delete":
      case "link":
      case "text-directive":
      case "html-element":
        walk(token.children, `${path}.`, config, prevLen, charCounter, entries);
        break;
      default:
        // code, inline-math, html, break, footnote-reference, image — skip
        break;
    }
  }
}

function processText(
  text: string,
  path: string,
  config: AnimationConfig,
  prevLen: number,
  charCounter: CharCounter,
  entries: Map<string, WordMeta[]>,
): void {
  if (!text.trim()) {
    charCounter.count += text.length;
    entries.set(path, [{ text, delay: 0, duration: 0, isWhitespace: true }]);
    return;
  }

  const parts = config.sep === "char" ? splitIntoChars(text) : splitIntoWords(text);
  const meta: WordMeta[] = parts.map((part) => {
    const partStart = charCounter.count;
    charCounter.count += part.length;
    if (isWhitespaceOnly(part)) {
      return { text: part, delay: 0, duration: 0, isWhitespace: true };
    }
    const skipAnimation = prevLen > 0 && partStart < prevLen;
    const delay = skipAnimation ? 0 : charCounter.newIndex++ * config.stagger;
    return {
      text: part,
      delay,
      duration: skipAnimation ? 0 : config.duration,
      isWhitespace: false,
    };
  });

  console.log("[computeAnimation.processText]", {
    path,
    text: text.slice(0, 40),
    partCount: parts.length,
    prevLen,
    words: meta.map((m) => ({
      text: m.text.slice(0, 15),
      skip: m.duration === 0 && !m.isWhitespace,
      ws: m.isWhitespace,
      delay: m.delay,
      dur: m.duration,
    })),
  });

  entries.set(path, meta);
}
