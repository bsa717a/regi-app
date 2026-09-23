import { describe, expect, it } from "vitest";
import {
  daysCountLabel,
  garageComplianceBanner,
  renewalHeroCopy,
  statusLabel,
} from "@/lib/registrations/brandCopy";

describe("brand copy", () => {
  it("formats card countdowns in data style", () => {
    expect(daysCountLabel(373)).toBe("373 DAYS");
    expect(daysCountLabel(1)).toBe("1 DAY");
    expect(daysCountLabel(0)).toBe("TODAY");
    expect(daysCountLabel(-63)).toBe("63 DAYS AGO");
    expect(statusLabel("Due Soon")).toBe("Due soon");
  });

  it("banners an all-current garage from the soonest renewal", () => {
    const banner = garageComplianceBanner([
      {
        nickname: "Trembleton",
        status: "Current",
        daysUntilExpiration: 373,
      },
      {
        nickname: "Twig",
        status: "Current",
        daysUntilExpiration: 400,
      },
    ]);
    expect(banner).toEqual({
      tone: "current",
      title: "Everything is current",
      detail: "Next renewal in 373 days. Nothing needed from you.",
    });
  });

  it("banners the most overdue vehicle", () => {
    const banner = garageComplianceBanner([
      {
        nickname: "Trembleton",
        status: "Current",
        daysUntilExpiration: 373,
      },
      {
        nickname: "Twig",
        status: "Expired",
        daysUntilExpiration: -63,
      },
    ]);
    expect(banner?.tone).toBe("expired");
    expect(banner?.title).toBe("1 vehicle out of compliance");
    expect(banner?.detail).toBe("Twig expired 63 days ago");
  });

  it("writes the renewals hero around the focus vehicle", () => {
    expect(
      renewalHeroCopy({
        nickname: "Twig",
        status: "Expired",
        daysUntilExpiration: -63,
      }),
    ).toEqual({
      count: "63",
      sentence: "days since Twig went out of compliance",
    });
    expect(
      renewalHeroCopy({
        nickname: "Shop trailer 04",
        status: "Due Soon",
        daysUntilExpiration: 23,
      }).sentence,
    ).toBe("days until Shop trailer 04 expires");
  });
});
