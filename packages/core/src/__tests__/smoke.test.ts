import { describe, expect, it } from "vitest";

import { VELOMARK_VERSION } from "../index";

describe("packages/core smoke", () => {
  it("exports a version constant", () => {
    expect(VELOMARK_VERSION).toBe("0.0.0");
  });
});
