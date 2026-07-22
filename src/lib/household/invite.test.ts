import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationService } from "@/lib/notifications/NotificationService";

const {
  householdFindUnique,
  householdMemberFindFirst,
  householdMemberFindUnique,
  householdMemberCreate,
  householdMemberUpdate,
  householdMemberDelete,
  householdMemberFindMany,
  userFindUnique,
} = vi.hoisted(() => ({
  householdFindUnique: vi.fn(),
  householdMemberFindFirst: vi.fn(),
  householdMemberFindUnique: vi.fn(),
  householdMemberCreate: vi.fn(),
  householdMemberUpdate: vi.fn(),
  householdMemberDelete: vi.fn(),
  householdMemberFindMany: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    household: { findUnique: householdFindUnique },
    householdMember: {
      findFirst: householdMemberFindFirst,
      findUnique: householdMemberFindUnique,
      findMany: householdMemberFindMany,
      create: householdMemberCreate,
      update: householdMemberUpdate,
      delete: householdMemberDelete,
    },
    user: { findUnique: userFindUnique },
  },
}));

vi.mock("@/lib/vehicles/household", async () => {
  const actual = await vi.importActual<typeof import("@/lib/vehicles/household")>(
    "@/lib/vehicles/household",
  );
  return {
    ...actual,
    getPrimaryHouseholdId: vi.fn(async () => "hh_1"),
  };
});

function mockDb() {
  return {
    household: { findUnique: householdFindUnique },
    householdMember: {
      findFirst: householdMemberFindFirst,
      findUnique: householdMemberFindUnique,
      findMany: householdMemberFindMany,
      create: householdMemberCreate,
      update: householdMemberUpdate,
      delete: householdMemberDelete,
    },
    user: { findUnique: userFindUnique },
  } as never;
}

describe("household invite + accept", () => {
  const notificationService: NotificationService = {
    send: vi.fn(async () => {}),
  };

  beforeEach(() => {
    householdFindUnique.mockReset();
    householdMemberFindFirst.mockReset();
    householdMemberFindUnique.mockReset();
    householdMemberCreate.mockReset();
    householdMemberUpdate.mockReset();
    householdMemberDelete.mockReset();
    householdMemberFindMany.mockReset();
    userFindUnique.mockReset();
    vi.mocked(notificationService.send).mockClear();
  });

  it("creates a pending viewer membership and sends invite email", async () => {
    const { inviteToHousehold } = await import("@/lib/household/invite");

    householdMemberFindFirst
      .mockResolvedValueOnce({ id: "owner_mem" }) // owner check
      .mockResolvedValueOnce(null); // existing invite
    householdFindUnique.mockResolvedValue({
      id: "hh_1",
      name: "Demo Household",
    });
    userFindUnique.mockResolvedValue(null);
    householdMemberCreate.mockResolvedValue({
      id: "mem_pending",
      userId: null,
      inviteEmail: "partner@example.com",
      role: "viewer",
      inviteStatus: "pending",
      user: null,
    });

    const result = await inviteToHousehold(
      "owner_1",
      "demo@regi.app",
      { email: "partner@example.com" },
      {
        db: mockDb(),
        notificationService,
        appOrigin: "http://localhost:3000",
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.member.role).toBe("viewer");
    expect(result.data.member.inviteStatus).toBe("pending");
    expect(householdMemberCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          householdId: "hh_1",
          role: "viewer",
          inviteStatus: "pending",
          inviteEmail: "partner@example.com",
        }),
      }),
    );
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "email",
        to: "partner@example.com",
        templateKey: "household_invite",
      }),
    );
  });

  it("blocks non-owners from inviting", async () => {
    const { inviteToHousehold } = await import("@/lib/household/invite");
    householdMemberFindFirst.mockResolvedValueOnce(null);

    const result = await inviteToHousehold(
      "viewer_1",
      "viewer@regi.app",
      { email: "someone@example.com", householdId: "hh_1" },
      {
        db: mockDb(),
        notificationService,
        appOrigin: "http://localhost:3000",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("accept links the logged-in user and marks membership accepted", async () => {
    const { acceptHouseholdInvite } = await import("@/lib/household/invite");

    householdMemberFindFirst.mockResolvedValueOnce({
      id: "mem_1",
      householdId: "hh_1",
      userId: null,
      inviteEmail: "partner@example.com",
      inviteToken: "tok_abc",
      inviteStatus: "pending",
      role: "viewer",
    });
    householdMemberUpdate.mockResolvedValue({});
    householdFindUnique.mockResolvedValue({
      id: "hh_1",
      name: "Demo Household",
      ownerUserId: "owner_1",
      members: [
        {
          id: "owner_mem",
          userId: "owner_1",
          inviteEmail: null,
          role: "owner",
          inviteStatus: "accepted",
          user: { email: "demo@regi.app", name: "Alex" },
        },
        {
          id: "mem_1",
          userId: "user_partner",
          inviteEmail: "partner@example.com",
          role: "viewer",
          inviteStatus: "accepted",
          user: { email: "partner@example.com", name: "Pat" },
        },
      ],
    });

    const result = await acceptHouseholdInvite(
      "user_partner",
      "partner@example.com",
      "tok_abc",
      { db: mockDb() },
    );

    expect(result.ok).toBe(true);
    expect(householdMemberUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "mem_1" },
        data: expect.objectContaining({
          userId: "user_partner",
          inviteStatus: "accepted",
          inviteToken: null,
          role: "viewer",
        }),
      }),
    );
    if (result.ok) {
      expect(result.data.household.myRole).toBe("viewer");
    }
  });
});
