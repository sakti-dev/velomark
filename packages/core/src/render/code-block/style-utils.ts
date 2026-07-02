import type { HighlightToken } from "../../lib/plugin-types";

export function parseShikiStyle(
  shikiValue: string | false | undefined,
  lightVar: string,
): Record<string, string> {
  if (!shikiValue) return {};
  const style: Record<string, string> = {};
  for (const segment of shikiValue.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const prop = trimmed.slice(0, colonIdx).trim();
      const val = trimmed.slice(colonIdx + 1).trim();
      if (prop && val) style[prop] = val;
    } else {
      style[lightVar] = trimmed;
    }
  }
  return style;
}

export function buildTokenStyle(token: HighlightToken): Record<string, string> {
  const style: Record<string, string> = {};
  if (token.color) style["--vm-c"] = token.color;
  if (token.bgColor) style["--vm-tbg"] = token.bgColor;
  if (token.htmlStyle) {
    for (const [key, value] of Object.entries(parseShikiStyle(token.htmlStyle, "color"))) {
      if (key === "color") style["--vm-c"] = value;
      else if (key === "background-color") style["--vm-tbg"] = value;
      else style[key] = value;
    }
  }
  return style;
}
