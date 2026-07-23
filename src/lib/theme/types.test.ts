import { describe, expect, it } from "vitest";
import { resolveTheme } from "@/lib/theme/types";

describe("resolveTheme", () => {
  it("returns light or dark directly when preference is explicit", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows system preference when set to system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
