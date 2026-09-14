import { describe, expect, it } from "vitest";
import { parseStateRulesConfig } from "@/lib/stateEngine/parseConfig";
import { UTAH_STATE_RULES_CONFIG } from "@/lib/stateEngine/utahConfig";

describe("parseStateRulesConfig", () => {
  it("accepts the Utah seed config", () => {
    const parsed = parseStateRulesConfig(UTAH_STATE_RULES_CONFIG);
    expect(parsed?.renewalWindow.dueSoonThresholdDays).toBe(60);
    expect(parsed?.registrationTypes?.some((type) => type.type === "trailer")).toBe(
      true,
    );
  });

  it("accepts dueSoonThresholdDays stored as a numeric string", () => {
    const parsed = parseStateRulesConfig({
      ...UTAH_STATE_RULES_CONFIG,
      renewalWindow: {
        ...UTAH_STATE_RULES_CONFIG.renewalWindow,
        dueSoonThresholdDays: "60",
      },
    });
    expect(parsed?.renewalWindow.dueSoonThresholdDays).toBe(60);
  });

  it("accepts a JSON string wrapper", () => {
    const parsed = parseStateRulesConfig(JSON.stringify(UTAH_STATE_RULES_CONFIG));
    expect(parsed?.displayName).toBe("Utah");
    expect(parsed?.renewalWindow.dueSoonThresholdDays).toBe(60);
  });

  it("returns null when the due-soon threshold is missing", () => {
    expect(
      parseStateRulesConfig({
        displayName: "Utah",
        renewalWindow: {},
      }),
    ).toBeNull();
  });
});
