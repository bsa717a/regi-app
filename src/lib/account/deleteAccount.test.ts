import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DELETE_ACCOUNT_CONFIRMATION,
  isDeleteConfirmation,
} from "@/lib/account/constants";
import { deleteAccount } from "@/lib/account/deleteAccount";

function makeTx() {
  return {
    householdMember: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    document: { updateMany: vi.fn() },
    registration: { updateMany: vi.fn() },
    renewal: { updateMany: vi.fn() },
    payment: { deleteMany: vi.fn() },
    household: { delete: vi.fn() },
    waitlist: { deleteMany: vi.fn() },
    auditLog: { updateMany: vi.fn() },
    staffUser: { deleteMany: vi.fn() },
    user: { delete: vi.fn() },
  };
}

function makeDb(tx: ReturnType<typeof makeTx>) {
  return {
    user: { findUnique: vi.fn() },
    household: { findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
  };
}

describe("isDeleteConfirmation", () => {
  it("accepts the exact confirm token", () => {
    expect(isDeleteConfirmation({ confirm: DELETE_ACCOUNT_CONFIRMATION })).toBe(
      true,
    );
  });

  it("rejects missing or wrong confirmation", () => {
    expect(isDeleteConfirmation({})).toBe(false);
    expect(isDeleteConfirmation({ confirm: "delete" })).toBe(false);
    expect(isDeleteConfirmation(null)).toBe(false);
  });
});

describe("deleteAccount", () => {
  let tx: ReturnType<typeof makeTx>;
  let db: ReturnType<typeof makeDb>;
  let deleteHouseholdFiles: (householdId: string) => Promise<void>;
  let deleteFirebaseUser: (uid: string) => Promise<void>;
  let deleteHouseholdFilesMock: ReturnType<typeof vi.fn<(id: string) => Promise<void>>>;
  let deleteFirebaseUserMock: ReturnType<typeof vi.fn<(uid: string) => Promise<void>>>;

  beforeEach(() => {
    tx = makeTx();
    db = makeDb(tx);
    deleteHouseholdFilesMock = vi.fn<(id: string) => Promise<void>>(async () => {});
    deleteFirebaseUserMock = vi.fn<(uid: string) => Promise<void>>(async () => {});
    deleteHouseholdFiles = deleteHouseholdFilesMock;
    deleteFirebaseUser = deleteFirebaseUserMock;
    tx.householdMember.findMany.mockResolvedValue([]);
  });

  it("deletes Firebase Auth before wiping Postgres", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "alex@example.com",
      firebaseUid: "fb-1",
    });
    db.household.findUnique.mockResolvedValue({ id: "hh-1" });

    await deleteAccount("fb-1", {
      db: db as never,
      deleteHouseholdFiles,
      deleteFirebaseUser,
    });

    expect(deleteHouseholdFilesMock).toHaveBeenCalledWith("hh-1");
    expect(tx.payment.deleteMany).toHaveBeenCalled();
    expect(tx.household.delete).toHaveBeenCalledWith({ where: { id: "hh-1" } });
    expect(tx.waitlist.deleteMany).toHaveBeenCalledWith({
      where: { email: "alex@example.com" },
    });
    expect(tx.auditLog.updateMany).toHaveBeenCalledWith({
      where: { actor: "user-1" },
      data: { actor: "deleted-user" },
    });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(deleteFirebaseUserMock).toHaveBeenCalledWith("fb-1");
    expect(deleteFirebaseUserMock.mock.invocationCallOrder[0]).toBeLessThan(
      db.$transaction.mock.invocationCallOrder[0]!,
    );
  });

  it("does not wipe Postgres if Firebase Auth deletion fails", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "alex@example.com",
      firebaseUid: "fb-1",
    });
    db.household.findUnique.mockResolvedValue({ id: "hh-1" });
    deleteFirebaseUserMock.mockRejectedValue(new Error("firebase down"));

    await expect(
      deleteAccount("fb-1", {
        db: db as never,
        deleteHouseholdFiles,
        deleteFirebaseUser,
      }),
    ).rejects.toThrow("firebase down");

    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("reassigns viewer-authored rows instead of deleting the shared household", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "viewer-1",
      email: "viewer@example.com",
      firebaseUid: "fb-viewer",
    });
    db.household.findUnique.mockResolvedValue({ id: "hh-own" });
    tx.householdMember.findMany.mockResolvedValue([
      {
        householdId: "hh-shared",
        household: { ownerUserId: "owner-1" },
      },
    ]);

    await deleteAccount("fb-viewer", {
      db: db as never,
      deleteHouseholdFiles,
      deleteFirebaseUser,
    });

    expect(deleteHouseholdFilesMock).toHaveBeenCalledWith("hh-own");
    expect(tx.household.delete).toHaveBeenCalledWith({
      where: { id: "hh-own" },
    });
    expect(tx.household.delete).not.toHaveBeenCalledWith({
      where: { id: "hh-shared" },
    });
    expect(tx.document.updateMany).toHaveBeenCalledWith({
      where: {
        uploadedBy: "viewer-1",
        registration: { householdId: "hh-shared" },
      },
      data: { uploadedBy: "owner-1" },
    });
    expect(tx.registration.updateMany).toHaveBeenCalledWith({
      where: { createdBy: "viewer-1", householdId: "hh-shared" },
      data: { createdBy: "owner-1" },
    });
    expect(tx.renewal.updateMany).toHaveBeenCalledWith({
      where: {
        requestedBy: "viewer-1",
        registration: { householdId: "hh-shared" },
      },
      data: { requestedBy: "owner-1" },
    });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: "viewer-1" } });
    expect(deleteFirebaseUserMock).toHaveBeenCalledWith("fb-viewer");
  });

  it("still deletes Firebase when there is no Postgres user", async () => {
    db.user.findUnique.mockResolvedValue(null);

    await deleteAccount("fb-gone", {
      db: db as never,
      deleteHouseholdFiles,
      deleteFirebaseUser,
    });

    expect(db.$transaction).not.toHaveBeenCalled();
    expect(deleteHouseholdFilesMock).not.toHaveBeenCalled();
    expect(deleteFirebaseUserMock).toHaveBeenCalledWith("fb-gone");
  });
});
