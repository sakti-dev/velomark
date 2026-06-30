import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vite-plus/test";

describe("package exports", () => {
  it("points the main export at the packed JavaScript and type artifacts", () => {
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      exports: {
        ".": {
          types: string;
          import: string;
        };
        "./styles.css": string;
        "./package.json": string;
      };
    };

    expect(packageJson.exports["."].types).toBe("./dist/index.d.mts");
    expect(packageJson.exports["."].import).toBe("./dist/index.mjs");
    expect(packageJson.exports["./styles.css"]).toBe("./dist/styles.css");
    expect(packageJson.exports["./package.json"]).toBe("./package.json");
  });

  it("ships the export artifacts after a build", () => {
    for (const artifact of ["dist/index.mjs", "dist/index.d.mts", "dist/styles.css"]) {
      expect(existsSync(path.resolve(process.cwd(), artifact))).toBe(true);
    }
  });
});
