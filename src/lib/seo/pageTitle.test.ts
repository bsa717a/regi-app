import { describe, expect, it } from "vitest";
import {
  APP_NAME,
  DOCUMENT_TITLE_TEMPLATE,
  pageMetadata,
  pageTitle,
  TITLE_SEPARATOR,
} from "@/lib/seo/pageTitle";

describe("pageTitle", () => {
  it("returns the brand when the segment is empty or already the brand", () => {
    expect(pageTitle("")).toBe("REGI");
    expect(pageTitle("   ")).toBe("REGI");
    expect(pageTitle("REGI")).toBe("REGI");
  });

  it("appends the brand with the middle-dot separator", () => {
    expect(pageTitle("Garage")).toBe("Garage · REGI");
    expect(pageTitle("Dashboard")).toBe("Dashboard · REGI");
    expect(pageTitle("Login")).toBe("Login · REGI");
    expect(pageTitle("  Renewals  ")).toBe("Renewals · REGI");
  });

  it("does not double-suffix an already formatted title", () => {
    expect(pageTitle("Admin · REGI")).toBe("Admin · REGI");
  });
});

describe("pageMetadata", () => {
  it("sets an absolute title so the root template cannot double-suffix", () => {
    expect(pageMetadata("Settings")).toEqual({
      title: { absolute: "Settings · REGI" },
    });
  });

  it("merges extra metadata fields without replacing the title", () => {
    expect(
      pageMetadata("Email confirmation", {
        robots: { index: false, follow: false },
      }),
    ).toEqual({
      title: { absolute: "Email confirmation · REGI" },
      robots: { index: false, follow: false },
    });
  });
});

describe("document title template", () => {
  it("matches the helper suffix convention", () => {
    expect(APP_NAME).toBe("REGI");
    expect(TITLE_SEPARATOR).toBe(" · ");
    expect(DOCUMENT_TITLE_TEMPLATE).toBe("%s · REGI");
    expect(DOCUMENT_TITLE_TEMPLATE.replace("%s", "Garage")).toBe(
      pageTitle("Garage"),
    );
  });
});
