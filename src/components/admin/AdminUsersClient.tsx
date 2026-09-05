"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  MailingAddressFields,
  mailingAddressFormValue,
} from "@/components/account/MailingAddressFields";
import { AdminTable } from "@/components/admin/AdminTable";
import { DELETE_ACCOUNT_CONFIRMATION } from "@/lib/account/constants";
import { formatMailingAddressShort } from "@/lib/account/mailingAddress";
import type { AdminUserListItem } from "@/lib/admin/types";
import {
  ApiError,
  adminDeleteUser,
  adminListUsers,
  adminUpdateUser,
} from "@/lib/api/client";
import {
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
  selectClassName,
} from "@/components/auth/AuthFormStyles";

const FILTER_DEBOUNCE_MS = 250;

function formatJoined(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function roleLabel(role: AdminUserListItem["role"]): string {
  return role === "admin" ? "Admin" : "User";
}

export function AdminUsersClient() {
  const { getIdToken } = useAuth();
  const [q, setQ] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [viewerFirebaseUid, setViewerFirebaseUid] = useState("");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminUserListItem | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAppliedQuery(q.trim());
    }, FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not signed in");
        const data = await adminListUsers(token, appliedQuery);
        if (!cancelled) {
          setUsers(data.users);
          setTotal(data.total);
          setViewerFirebaseUid(data.viewerFirebaseUid);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load users",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [getIdToken, appliedQuery]);

  function onSaved(next: AdminUserListItem) {
    setUsers((prev) => prev.map((user) => (user.id === next.id ? next : user)));
    setEditing(null);
  }

  function onDeleted(userId: string) {
    setUsers((prev) => prev.filter((user) => user.id !== userId));
    setTotal((prev) => Math.max(0, prev - 1));
    setEditing(null);
  }

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter by email or name…"
        aria-label="Filter users by email or name"
        className={`${fieldClassName} mt-0 mb-4`}
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {editing ? (
        <EditUserForm
          user={editing}
          isSelf={editing.firebaseUid === viewerFirebaseUid}
          getIdToken={getIdToken}
          onCancel={() => setEditing(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      ) : null}

      {!error ? (
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
          {loading && users.length === 0
            ? "Loading users…"
            : appliedQuery
              ? `${total} user${total === 1 ? "" : "s"} matching “${appliedQuery}”`
              : `${total} user${total === 1 ? "" : "s"}`}
          {!loading && users.length < total
            ? ` · showing ${users.length} newest`
            : null}
        </p>
      ) : null}

      {!loading && !error && users.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {appliedQuery ? "No users matched." : "No users yet."}
        </p>
      ) : null}

      {users.length > 0 ? (
        <AdminTable
          headers={[
            "Name",
            "Email",
            "Phone",
            "Address",
            "Role",
            "Joined",
            "Vehicles",
            "Renewals",
            "",
          ]}
        >
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                {user.name || "(no name)"}
              </td>
              <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                {user.email}
              </td>
              <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                {user.phone || "—"}
              </td>
              <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                {formatMailingAddressShort(user)}
              </td>
              <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                {roleLabel(user.role)}
              </td>
              <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                {formatJoined(user.createdAt)}
              </td>
              <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                {user.registrationCount}
              </td>
              <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                {user.renewalCount}
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => setEditing(user)}
                  className="font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </AdminTable>
      ) : null}
    </div>
  );
}

function EditUserForm({
  user,
  isSelf,
  getIdToken,
  onCancel,
  onSaved,
  onDeleted,
}: {
  user: AdminUserListItem;
  isSelf: boolean;
  getIdToken: () => Promise<string | null>;
  onCancel: () => void;
  onSaved: (user: AdminUserListItem) => void;
  onDeleted: (userId: string) => void;
}) {
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [address, setAddress] = useState(mailingAddressFormValue(user));
  const [role, setRole] = useState<AdminUserListItem["role"]>(user.role);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setName(user.name ?? "");
    setPhone(user.phone ?? "");
    setAddress(mailingAddressFormValue(user));
    setRole(user.role);
    setConfirmDelete(false);
    setConfirmText("");
    setFormError(null);
  }, [user]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const next = await adminUpdateUser(token, user.id, {
        name: name.trim() || null,
        phone: phone.trim() || null,
        addressLine1: address.addressLine1.trim() || null,
        addressLine2: address.addressLine2.trim() || null,
        city: address.city.trim() || null,
        addressState: address.addressState || null,
        postalCode: address.postalCode.trim() || null,
        role,
      });
      onSaved(next);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Could not save user",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    setFormError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      await adminDeleteUser(token, user.id);
      onDeleted(user.id);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Could not delete user",
      );
      setDeleting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700/80 dark:bg-slate-900"
    >
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        Edit user
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {user.email}
      </p>

      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="admin-user-name" className={labelClassName}>
              Name
            </label>
            <input
              id="admin-user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClassName}
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="admin-user-phone" className={labelClassName}>
              Phone
            </label>
            <input
              id="admin-user-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={fieldClassName}
              autoComplete="tel"
            />
          </div>
        </div>
        <MailingAddressFields
          idPrefix="admin-user"
          value={address}
          onChange={setAddress}
        />
        <div>
          <label htmlFor="admin-user-role" className={labelClassName}>
            Role
          </label>
          <select
            id="admin-user-role"
            value={role}
            onChange={(e) =>
              setRole(e.target.value === "admin" ? "admin" : "user")
            }
            disabled={isSelf}
            className={selectClassName}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          {isSelf ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              You cannot change your own role.
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Admins can open the portal and manage users.
            </p>
          )}
        </div>
      </div>

      {formError ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {formError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={saving || deleting}
          className={primaryButtonClassName}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving || deleting}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          Cancel
        </button>
      </div>

      {!isSelf ? (
        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(true);
                setFormError(null);
              }}
              className="text-sm font-medium text-red-800 underline-offset-4 hover:underline dark:text-red-300"
            >
              Delete user
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                This permanently removes their account, owned vehicles, renewals,
                and documents. Type {DELETE_ACCOUNT_CONFIRMATION} to confirm.
              </p>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className={fieldClassName}
                autoComplete="off"
                autoCapitalize="characters"
                aria-label={`Type ${DELETE_ACCOUNT_CONFIRMATION} to confirm`}
                disabled={deleting}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={
                    confirmText.trim().toUpperCase() !==
                      DELETE_ACCOUNT_CONFIRMATION || deleting
                  }
                  onClick={() => void onDelete()}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-red-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-600"
                >
                  {deleting ? "Deleting…" : "Permanently delete"}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setConfirmDelete(false);
                    setConfirmText("");
                  }}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  Keep user
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </form>
  );
}
