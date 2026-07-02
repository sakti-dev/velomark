import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vite-plus/test";

type ExportConditions = Record<string, string>;

describe("package exports", () => {
  const packageJson = JSON.parse(
    readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
  ) as {
    exports: {
      ".": ExportConditions;
      "./styles.css": string;
      "./package.json": string;
    };
  };

  it("points the main export at packed dist artifacts with source fallback for dev", () => {
    const main = packageJson.exports["."];
    expect(main.development).toBe("./src/index.tsx");
    expect(main.types).toBe("./dist/index.d.mts");
    expect(main.import).toBe("./dist/index.mjs");
  });

  it("exposes styles.css at the package root", () => {
    expect(packageJson.exports["./styles.css"]).toBe("./styles.css");
  });

  it("exposes package.json", () => {
    expect(packageJson.exports["./package.json"]).toBe("./package.json");
  });

  it("ships the export artifacts after a build", () => {
    for (const artifact of ["dist/index.mjs", "dist/index.d.mts"]) {
      expect(existsSync(path.resolve(process.cwd(), artifact))).toBe(true);
    }
  });
});
