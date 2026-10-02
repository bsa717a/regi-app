import { describe, expect, it } from "vitest";
import { assertNonProdStateRulesDatabase } from "@/lib/deploy/stateRulesEnsure";

describe("assertNonProdStateRulesDatabase", () => {
  it("accepts the staging database", () => {
    expect(
      assertNonProdStateRulesDatabase(
        "postgresql://user:pass@127.0.0.1:5432/regi_staging",
      ),
    ).toBe("regi_staging");
  });

  it("refuses the production database", () => {
    expect(() =>
      assertNonProdStateRulesDatabase(
        "postgresql://user:pass@127.0.0.1:5432/regi",
      ),
    ).toThrow(/refusing/i);
  });

  it("refuses a database name that is not staging, preview, or pr_", () => {
    expect(() =>
      assertNonProdStateRulesDatabase(
        "postgresql://user:pass@127.0.0.1:5432/regi_local",
      ),
    ).toThrow(/staging, preview, or pr_/);
  });
});
