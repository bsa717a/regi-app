import { describe, expect, it } from "vitest";
import {
  buildRenewalStatusHistory,
  isTerminalRenewalSuccess,
  TERMINAL_RENEWAL_SUCCESS_STATUSES,
  timestampsFromRenewalDates,
} from "./history";
import { RENEWAL_STATUS_ORDER } from "./status";
import type { RenewalTimestamps } from "./types";

const timestamps: RenewalTimestamps = {
  requestedAt: "2026-03-01T15:00:00.000Z",
  documentsReceivedAt: "2026-03-02T15:00:00.000Z",
  reviewingAt: "2026-03-03T15:00:00.000Z",
  processingAt: "2026-03-04T15:00:00.000Z",
  submittedAt: "2026-03-05T15:00:00.000Z",
  completedAt: "2026-03-06T15:00:00.000Z",
  stickerMailedAt: "2026-03-07T15:00:00.000Z",
};

describe("isTerminalRenewalSuccess", () => {
  it("treats StickerMailed as the only terminal success today", () => {
    expect(isTerminalRenewalSuccess("StickerMailed")).toBe(true);
    expect(TERMINAL_RENEWAL_SUCCESS_STATUSES).toEqual(["StickerMailed"]);
  });

  it("does not treat in-progress or Completed as proof-ready", () => {
    for (const status of RENEWAL_STATUS_ORDER) {
      if (status === "StickerMailed") continue;
      expect(isTerminalRenewalSuccess(status)).toBe(false);
    }
  });
});

describe("buildRenewalStatusHistory", () => {
  it("walks the existing timestamp columns in status order", () => {
    const history = buildRenewalStatusHistory(timestamps);
    expect(history.map((entry) => entry.status)).toEqual(RENEWAL_STATUS_ORDER);
    expect(history[0]).toEqual({
      status: "Requested",
      label: "Requested",
      at: timestamps.requestedAt,
    });
    expect(history.at(-1)).toEqual({
      status: "StickerMailed",
      label: "Sticker Mailed",
      at: timestamps.stickerMailedAt,
    });
  });

  it("keeps nulls for steps that have not happened", () => {
    const history = buildRenewalStatusHistory({
      ...timestamps,
      processingAt: null,
      submittedAt: null,
      completedAt: null,
      stickerMailedAt: null,
    });
    expect(history.find((e) => e.status === "Reviewing")?.at).toBe(
      timestamps.reviewingAt,
    );
    expect(history.find((e) => e.status === "StickerMailed")?.at).toBeNull();
  });
});

describe("timestampsFromRenewalDates", () => {
  it("maps Prisma Date columns onto the DTO timestamp shape", () => {
    const mapped = timestampsFromRenewalDates({
      requestedAt: new Date("2026-03-01T15:00:00.000Z"),
      documentsReceivedAt: new Date("2026-03-02T15:00:00.000Z"),
      reviewingAt: null,
      processingAt: null,
      submittedAt: null,
      completedAt: null,
      stickerMailedAt: null,
    });
    expect(mapped.requestedAt).toBe("2026-03-01T15:00:00.000Z");
    expect(mapped.documentsReceivedAt).toBe("2026-03-02T15:00:00.000Z");
    expect(mapped.reviewingAt).toBeNull();
    expect(mapped.stickerMailedAt).toBeNull();
  });
});
