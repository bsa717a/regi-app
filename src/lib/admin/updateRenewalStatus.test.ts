import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Renewal, StaffUser } from "@prisma/client";
import {
  AdminRenewalError,
  parseAdminStatusBody,
  updateAdminRenewalStatus,
} from "./updateRenewalStatus";

function staffFixture(): StaffUser {
  return {
    id: "staff_1",
    firebaseUid: "staff-uid-1",
    name: "Riley Staff",
    role: "agent",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function renewalFixture(status: Renewal["status"] = "Reviewing"): Renewal {
  return {
    id: "ren_1",
    vehicleId: "veh_1",
    status,
    requestedBy: "user_1",
    feeBreakdown: {},
    stripePaymentIntentId: null,
    staffNotes: null,
    requestedAt: new Date(),
    documentsReceivedAt: new Date(),
    reviewingAt: new Date(),
    processingAt: null,
    submittedAt: null,
    completedAt: null,
    stickerMailedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("parseAdminStatusBody", () => {
  it("accepts a valid status", () => {
    expect(parseAdminStatusBody({ status: "Processing" })).toEqual({
      ok: true,
      status: "Processing",
    });
  });

  it("rejects invalid status", () => {
    const result = parseAdminStatusBody({ status: "Nope" });
    expect(result.ok).toBe(false);
  });
});

describe("updateAdminRenewalStatus", () => {
  const findUnique = vi.fn();
  const advance = vi.fn();
  const audit = vi.fn();
  const notificationService = { send: vi.fn() };

  beforeEach(() => {
    findUnique.mockReset();
    advance.mockReset();
    audit.mockReset();
    findUnique.mockResolvedValue(renewalFixture("Reviewing"));
    advance.mockResolvedValue({
      renewal: renewalFixture("Processing"),
      previousStatus: "Reviewing",
      newStatus: "Processing",
      transitionedAt: new Date("2026-07-22T18:00:00.000Z"),
    });
    audit.mockResolvedValue({});
  });

  it("calls advanceRenewalStatus and writeAudit", async () => {
    const db = {
      renewal: { findUnique },
    };

    const result = await updateAdminRenewalStatus(
      {
        renewalId: "ren_1",
        newStatus: "Processing",
        staff: staffFixture(),
      },
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db: db as any,
        notificationService,
        advance,
        audit,
      },
    );

    expect(advance).toHaveBeenCalledWith(
      "ren_1",
      "Processing",
      { kind: "staff", staffUserId: "staff_1" },
      expect.objectContaining({
        db,
        notificationService,
      }),
    );
    expect(audit).toHaveBeenCalledWith(
      {
        actor: "staff-uid-1",
        action: "renewal.status_update",
        entity: "renewal:ren_1",
        before: { status: "Reviewing" },
        after: {
          status: "Processing",
          staffId: "staff_1",
          staffName: "Riley Staff",
        },
      },
      { db },
    );
    expect(result.newStatus).toBe("Processing");
  });

  it("rejects invalid transitions before advancing", async () => {
    findUnique.mockResolvedValue(renewalFixture("Reviewing"));
    const db = { renewal: { findUnique } };

    await expect(
      updateAdminRenewalStatus(
        {
          renewalId: "ren_1",
          newStatus: "Completed",
          staff: staffFixture(),
        },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          db: db as any,
          notificationService,
          advance,
          audit,
        },
      ),
    ).rejects.toBeInstanceOf(AdminRenewalError);

    expect(advance).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it("throws 404 when renewal is missing", async () => {
    findUnique.mockResolvedValue(null);
    const db = { renewal: { findUnique } };

    await expect(
      updateAdminRenewalStatus(
        {
          renewalId: "missing",
          newStatus: "Processing",
          staff: staffFixture(),
        },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          db: db as any,
          notificationService,
          advance,
          audit,
        },
      ),
    ).rejects.toMatchObject({ status: 404 });
  });
});
