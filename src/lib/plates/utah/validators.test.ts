import { describe, expect, it } from "vitest";
import {
  collectSoftWarnings,
  normalizePlateCombo,
  softContentWarnings,
  validatePlateCombo,
  validatePlateCombos,
  validatePlateMeaning,
} from "./validators";

describe("normalizePlateCombo", () => {
  it("uppercases letters and leaves digits", () => {
    expect(normalizePlateCombo("regi01")).toBe("REGI01");
  });
});

describe("validatePlateCombo", () => {
  it("accepts letters and numbers within the standard 7-character limit", () => {
    expect(validatePlateCombo("REGI01", "standard_life_elevated")).toEqual({
      ok: true,
      value: "REGI01",
    });
  });

  it("counts spaces toward the plate-type length limit", () => {
    const result = validatePlateCombo("REGI 01", "standard_life_elevated");
    expect(result).toEqual({ ok: true, value: "REGI 01" });

    expect(validatePlateCombo("TOOLONG1", "standard_life_elevated")).toEqual({
      ok: false,
      error:
        "This plate type allows up to 7 characters, including spaces.",
    });
  });

  it("enforces shorter limits for specialty and motorcycle types", () => {
    expect(validatePlateCombo("UTAH1", "in_god_we_trust")).toEqual({
      ok: true,
      value: "UTAH1",
    });
    expect(validatePlateCombo("UTAH12", "in_god_we_trust").ok).toBe(false);
    expect(validatePlateCombo("RIDE", "motorcycle_special_or_igwt")).toEqual({
      ok: true,
      value: "RIDE",
    });
    expect(validatePlateCombo("RIDER", "motorcycle_special_or_igwt").ok).toBe(
      false,
    );
    expect(validatePlateCombo("RADIO1", "radio")).toEqual({
      ok: true,
      value: "RADIO1",
    });
  });

  it("uses the selected special-group design limit (5 vs Historic B&W 7)", () => {
    expect(
      validatePlateCombo("ELK01", "special_group", "special_group_wildlife_elk"),
    ).toEqual({ ok: true, value: "ELK01" });
    expect(
      validatePlateCombo("ELK012", "special_group", "special_group_wildlife_elk")
        .ok,
    ).toBe(false);
    expect(
      validatePlateCombo("JAZZ1", "special_group", "special_group_utah_jazz"),
    ).toEqual({ ok: true, value: "JAZZ1" });
    expect(
      validatePlateCombo("JAZZ12", "special_group", "special_group_utah_jazz").ok,
    ).toBe(false);
    expect(
      validatePlateCombo(
        "HISTOR1",
        "special_group",
        "special_group_historic_bw",
      ),
    ).toEqual({ ok: true, value: "HISTOR1" });
    expect(
      validatePlateCombo(
        "HISTOR12",
        "special_group",
        "special_group_historic_bw",
      ).ok,
    ).toBe(false);
    expect(validatePlateCombo("ELK012", "special_group").ok).toBe(false);
  });

  it("bans punctuation and other special characters", () => {
    const cases = ["REGI-1", "REGI.1", "O'REGI", "REGI!", "REGI_1", "REGI#1"];
    for (const value of cases) {
      const result = validatePlateCombo(value, "standard_life_elevated");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/punctuation/i);
      }
    }
  });

  it("rejects empty or space-only combinations", () => {
    expect(validatePlateCombo("   ", "standard_life_elevated").ok).toBe(false);
    expect(validatePlateCombo("", "special_group").ok).toBe(false);
  });
});

describe("validatePlateCombos", () => {
  it("requires a first choice and accepts up to three unique values", () => {
    expect(
      validatePlateCombos(
        ["REGI01", "REGI1", "UTAHGO"],
        "standard_life_elevated",
      ),
    ).toEqual({
      ok: true,
      values: ["REGI01", "REGI1", "UTAHGO"],
    });
  });

  it("flags duplicates and invalid later choices", () => {
    const result = validatePlateCombos(
      ["REGI01", "REGI01", "HI!"],
      "standard_life_elevated",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[1]).toMatch(/different/i);
      expect(result.errors[2]).toMatch(/punctuation/i);
    }
  });
});

describe("softContentWarnings", () => {
  it("warns on vulgar, drug, and sequential-looking combinations without blocking", () => {
    expect(softContentWarnings("FUCKU").some((w) => w.id === "vulgar")).toBe(
      true,
    );
    expect(softContentWarnings("WEED1").some((w) => w.id === "drugs")).toBe(
      true,
    );
    expect(
      softContentWarnings("ABC1234").some((w) => w.id === "sequential-like"),
    ).toBe(true);
    expect(softContentWarnings("REGI01")).toEqual([]);
  });

  it("attaches the combo to collected warnings", () => {
    const warnings = collectSoftWarnings(["REGI01", "XXX1"]);
    expect(warnings.some((w) => w.message.startsWith("XXX1:"))).toBe(true);
  });
});

describe("validatePlateMeaning", () => {
  it("requires a short explanation", () => {
    expect(validatePlateMeaning(" ").ok).toBe(false);
    expect(validatePlateMeaning("Family initials")).toEqual({
      ok: true,
      value: "Family initials",
    });
  });
});
