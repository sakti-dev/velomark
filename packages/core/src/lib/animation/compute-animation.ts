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
  maxStaggerWindow: number;
}

export function resolveAnimationConfig(config: AnimateOptions): AnimationConfig {
  return {
    animation: config.animation ?? "fadeIn",
    duration: config.duration ?? 150,
    easing: config.easing ?? "ease",
    sep: config.sep ?? "word",
    stagger: config.stagger ?? 40,
    maxStaggerWindow: config.maxStaggerWindow ?? 400,
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

interface PendingWord {
  meta: WordMeta;
  index: number;
}

/**
 * After the walk, compress stagger for large batches so the full cascade
 * finishes within `maxStaggerWindow`. Small batches keep the linear stagger.
 */
function applyAdaptiveStagger(pending: PendingWord[], config: AnimationConfig): void {
  const count = pending.length;
  if (count <= 1) return;

  const stagger = Math.min(config.stagger, config.maxStaggerWindow / count);
  for (const { meta, index } of pending) {
    meta.delay = index * stagger;
  }
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
  const pending: PendingWord[] = [];

  walk(tokens, "", config, prevContentLength, charCounter, entries, pending);

  applyAdaptiveStagger(pending, config);

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
  const pending: PendingWord[] = [];

  for (const input of inputs) {
    walk(input.tokens, input.basePath, config, prevContentLength, charCounter, entries, pending);
  }

  applyAdaptiveStagger(pending, config);

  return { entries, totalChars: charCounter.count };
}

function walk(
  tokens: InlineToken[],
  basePath: string,
  config: AnimationConfig,
  prevLen: number,
  charCounter: CharCounter,
  entries: Map<string, WordMeta[]>,
  pending: PendingWord[],
): void {
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) continue;
    const path = `${basePath}${i}`;

    switch (token.type) {
      case "text":
        processText(token.text, path, config, prevLen, charCounter, entries, pending);
        break;
      case "emphasis":
      case "strong":
      case "delete":
      case "link":
      case "text-directive":
      case "html-element":
        walk(token.children, `${path}.`, config, prevLen, charCounter, entries, pending);
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
  pending: PendingWord[],
): void {
  if (!text.trim()) {
    charCounter.count += text.length;
    entries.set(path, [{ text, delay: 0, duration: 0, isWhitespace: true }]);
    return;
  }

  const parts = config.sep === "char" ? splitIntoChars(text) : splitIntoWords(text);
  const meta: WordMeta[] = [];

  for (const part of parts) {
    const partStart = charCounter.count;
    charCounter.count += part.length;

    if (isWhitespaceOnly(part)) {
      meta.push({ text: part, delay: 0, duration: 0, isWhitespace: true });
      continue;
    }

    const skipAnimation = prevLen > 0 && partStart < prevLen;
    if (skipAnimation) {
      meta.push({ text: part, delay: 0, duration: 0, isWhitespace: false });
    } else {
      const index = charCounter.newIndex++;
      const wordMeta: WordMeta = {
        text: part,
        delay: 0,
        duration: config.duration,
        isWhitespace: false,
      };
      pending.push({ meta: wordMeta, index });
      meta.push(wordMeta);
    }
  }

  entries.set(path, meta);
}
