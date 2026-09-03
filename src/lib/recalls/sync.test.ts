import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Registration } from "@prisma/client";

const { findUnique, update, create, registrationUpdate } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  registrationUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    registrationRecall: {
      findUnique,
      update,
      create,
    },
    registration: {
      update: registrationUpdate,
    },
  },
}));

import { syncRecallsForRegistration } from "./sync";

const registration = {
  id: "reg_1",
  type: "passenger",
  year: 2020,
  make: "Honda",
  model: "Civic",
} as Registration;

describe("syncRecallsForRegistration", () => {
  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset();
    create.mockReset();
    registrationUpdate.mockReset();
  });

  it("inserts new campaigns as open", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "recall_1" });
    registrationUpdate.mockResolvedValue({});

    const result = await syncRecallsForRegistration(
      registration,
      [
        {
          nhtsaCampaignNumber: "23V458000",
          manufacturer: "Honda",
          component: "BRAKES",
          summary: "Summary",
          consequence: "Risk",
          remedy: "Fix",
          notesFromNhtsa: null,
          reportReceivedDate: "29/06/2023",
          parkIt: false,
          parkOutside: false,
          overTheAirUpdate: false,
        },
      ],
      new Date("2026-08-13T12:00:00.000Z"),
    );

    expect(result).toEqual({ inserted: 1, updated: 0, total: 1 });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          registrationId: "reg_1",
          nhtsaCampaignNumber: "23V458000",
          status: "open",
        }),
      }),
    );
    expect(registrationUpdate).toHaveBeenCalledWith({
      where: { id: "reg_1" },
      data: { recallsCheckedAt: new Date("2026-08-13T12:00:00.000Z") },
    });
  });

  it("preserves user status and notes on refresh", async () => {
    findUnique.mockResolvedValue({
      id: "recall_existing",
      status: "completed",
      userNotes: "Fixed at dealer 6/1",
      completedAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    update.mockResolvedValue({ id: "recall_existing" });
    registrationUpdate.mockResolvedValue({});

    await syncRecallsForRegistration(registration, [
      {
        nhtsaCampaignNumber: "23V458000",
        manufacturer: "Honda",
        component: "BRAKES",
        summary: "Updated summary",
        consequence: "Updated risk",
        remedy: "Updated remedy",
        notesFromNhtsa: null,
        reportReceivedDate: "29/06/2023",
        parkIt: true,
        parkOutside: false,
        overTheAirUpdate: false,
      },
    ]);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "recall_existing" },
        data: expect.objectContaining({
          summary: "Updated summary",
          parkIt: true,
        }),
      }),
    );
    expect(update.mock.calls[0]?.[0]?.data).not.toHaveProperty("status");
    expect(update.mock.calls[0]?.[0]?.data).not.toHaveProperty("userNotes");
    expect(update.mock.calls[0]?.[0]?.data).not.toHaveProperty("completedAt");
    expect(create).not.toHaveBeenCalled();
  });
});
