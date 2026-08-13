import { describe, expect, it } from "vitest";
import { parsePatchRecallBody } from "./validation";

describe("parsePatchRecallBody", () => {
  it("accepts status updates", () => {
    const parsed = parsePatchRecallBody({ status: "completed" });
    expect(parsed).toEqual({ ok: true, value: { status: "completed" } });
  });

  it("accepts userNotes", () => {
    const parsed = parsePatchRecallBody({ userNotes: "Dealer visit 8/13" });
    expect(parsed).toEqual({
      ok: true,
      value: { userNotes: "Dealer visit 8/13" },
    });
  });

  it("rejects invalid status", () => {
    const parsed = parsePatchRecallBody({ status: "ignored" });
    expect(parsed.ok).toBe(false);
  });

  it("rejects empty body", () => {
    const parsed = parsePatchRecallBody({});
    expect(parsed.ok).toBe(false);
  });
});
