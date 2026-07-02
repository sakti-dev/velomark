import { describe, expect, it } from "vitest";

import type { InlineToken } from "../../../types";
import {
  type AnimationConfig,
  type WordMeta,
  computeAnimation,
  computeAnimationMulti,
  resolveAnimationConfig,
} from "../compute-animation";

const cfg = (overrides?: Partial<AnimationConfig>): AnimationConfig => ({
  animation: "fadeIn",
  duration: 150,
  easing: "ease",
  sep: "word",
  stagger: 40,
  maxStaggerWindow: 400,
  ...overrides,
});

const textToken = (text: string): InlineToken => ({ type: "text", text });

const delaysOf = (result: { entries: Map<string, WordMeta[]> }, path = "0"): number[] => {
  const metas = result.entries.get(path);
  if (!metas) return [];
  return metas.filter((m) => !m.isWhitespace).map((m) => m.delay);
};

describe("resolveAnimationConfig", () => {
  it("defaults maxStaggerWindow to 400ms", () => {
    expect(resolveAnimationConfig({}).maxStaggerWindow).toBe(400);
  });

  it("respects custom maxStaggerWindow", () => {
    expect(resolveAnimationConfig({ maxStaggerWindow: 200 }).maxStaggerWindow).toBe(200);
  });
});

describe("adaptive stagger", () => {
  it("single new word gets delay 0", () => {
    const result = computeAnimation([textToken("hello")], cfg(), 0);
    expect(delaysOf(result)).toEqual([0]);
  });

  it("small batch uses linear stagger at config.stagger", () => {
    const result = computeAnimation([textToken("one two three four five")], cfg(), 0);
    expect(delaysOf(result)).toEqual([0, 40, 80, 120, 160]);
  });

  it("threshold: 10 words with stagger=40 window=400 stays uncompressed", () => {
    // 400 / 10 = 40 → no compression
    const words = Array.from({ length: 10 }, (_, i) => `w${i}`).join(" ");
    const result = computeAnimation([textToken(words)], cfg(), 0);
    const delays = delaysOf(result);
    expect(delays[9]).toBe(360); // 9 * 40
  });

  it("large batch compresses stagger so max delay <= maxStaggerWindow", () => {
    const words = Array.from({ length: 50 }, (_, i) => `w${i}`).join(" ");
    const result = computeAnimation([textToken(words)], cfg(), 0);
    const delays = delaysOf(result);
    expect(delays).toHaveLength(50);
    expect(Math.max(...delays)).toBeLessThanOrEqual(400);
    // stagger = min(40, 400/50) = 8; last delay = 49 * 8 = 392
    expect(delays[49]).toBeCloseTo(392, 5);
  });

  it("custom maxStaggerWindow compresses tighter", () => {
    const words = Array.from({ length: 20 }, (_, i) => `w${i}`).join(" ");
    const result = computeAnimation([textToken(words)], cfg({ maxStaggerWindow: 200 }), 0);
    const delays = delaysOf(result);
    // stagger = min(40, 200/20) = 10; max delay = 19 * 10 = 190
    expect(Math.max(...delays)).toBeLessThanOrEqual(200);
    expect(delays[19]).toBeCloseTo(190, 5);
  });

  it("only new words get adaptive stagger, old words skipped", () => {
    const r1 = computeAnimation([textToken("one two three")], cfg(), 0);
    const r2 = computeAnimation([textToken("one two three four five six")], cfg(), r1.totalChars);
    const delays = delaysOf(r2);
    expect(delays).toHaveLength(6);
    expect(delays.slice(0, 3)).toEqual([0, 0, 0]); // old
    expect(delays.slice(3)).toEqual([0, 40, 80]); // new batch of 3
  });

  it("large batch of new words after old content compresses correctly", () => {
    const oldText = "old ";
    const r1 = computeAnimation([textToken(oldText)], cfg(), 0);
    const newWords = Array.from({ length: 30 }, (_, i) => `w${i}`).join(" ");
    const r2 = computeAnimation([textToken(oldText + newWords)], cfg(), r1.totalChars);
    const delays = delaysOf(r2);
    const newDelays = delays.slice(1); // skip old word
    expect(newDelays).toHaveLength(30);
    expect(Math.max(...newDelays)).toBeLessThanOrEqual(400);
  });

  it("whitespace-only tokens excluded from stagger", () => {
    const result = computeAnimation([textToken("   ")], cfg(), 0);
    const metas = result.entries.get("0")!;
    expect(metas.every((m) => m.isWhitespace)).toBe(true);
    expect(metas.every((m) => m.delay === 0)).toBe(true);
  });
});

describe("computeAnimationMulti", () => {
  it("shares stagger continuously across inputs", () => {
    const inputs = [
      { tokens: [textToken("a b c")], basePath: "c0." },
      { tokens: [textToken("d e f")], basePath: "c1." },
    ];
    const result = computeAnimationMulti(inputs, cfg(), 0);
    expect(delaysOf(result, "c0.0")).toEqual([0, 40, 80]);
    expect(delaysOf(result, "c1.0")).toEqual([120, 160, 200]);
  });

  it("compresses large batches shared across inputs", () => {
    const words1 = Array.from({ length: 25 }, (_, i) => `a${i}`).join(" ");
    const words2 = Array.from({ length: 25 }, (_, i) => `b${i}`).join(" ");
    const inputs = [
      { tokens: [textToken(words1)], basePath: "c0." },
      { tokens: [textToken(words2)], basePath: "c1." },
    ];
    const result = computeAnimationMulti(inputs, cfg(), 0);
    const all = [...delaysOf(result, "c0.0"), ...delaysOf(result, "c1.0")];
    expect(all).toHaveLength(50);
    expect(Math.max(...all)).toBeLessThanOrEqual(400);
  });
});
