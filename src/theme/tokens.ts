import { darkTheme } from "./dark-theme";
import { defaultTheme } from "./default-theme";
import { velomarkColors } from "./colors";

export { velomarkColors };
export { darkTheme, defaultTheme };

export const velomarkTokens = {
  radius: "0.5rem",
  fontFamily:
    '"IBM Plex Sans", "Iosevka Aile", ui-sans-serif, system-ui, sans-serif',
  lineHeight: "1.6",
  blockGap: "1rem",
  inlineCodePadding: "0.1rem 0.35rem",
} as const;

export const velomarkThemePresets = {
  dark: darkTheme,
  default: defaultTheme,
} as const;
