import { beforeEach, describe, expect, it, vi } from "vitest";

describe("writeAudit", () => {
  const create = vi.fn();

  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({
      id: "audit_1",
      actor: "staff-uid",
      action: "renewal.status_update",
      entity: "renewal:ren_1",
      before: { status: "Reviewing" },
      after: { status: "Processing" },
      createdAt: new Date("2026-07-22T18:00:00.000Z"),
    });
  });

  it("writes the expected audit_log shape via prisma", async () => {
    const { writeAudit } = await import("./log");

    const db = {
      auditLog: { create },
    };

    const row = await writeAudit(
      {
        actor: "staff-uid",
        action: "renewal.status_update",
        entity: "renewal:ren_1",
        before: { status: "Reviewing" },
        after: { status: "Processing", staffId: "staff_1" },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { db: db as any },
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        actor: "staff-uid",
        action: "renewal.status_update",
        entity: "renewal:ren_1",
        before: { status: "Reviewing" },
        after: { status: "Processing", staffId: "staff_1" },
      },
    });
    expect(row.id).toBe("audit_1");
    expect(row.action).toBe("renewal.status_update");
  });

  it("omits null before/after fields", async () => {
    const { writeAudit } = await import("./log");
    const db = { auditLog: { create } };

    await writeAudit(
      {
        actor: "staff-uid",
        action: "renewal.resend_email",
        entity: "renewal:ren_1",
        before: null,
        after: { templateKey: "renewal_status_Reviewing" },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { db: db as any },
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        actor: "staff-uid",
        action: "renewal.resend_email",
        entity: "renewal:ren_1",
        before: undefined,
        after: { templateKey: "renewal_status_Reviewing" },
      },
    });
  });
});
