import type { RenewalStatus } from "@prisma/client";
import type {
  AdminRenewalDetailResponse,
  AdminRenewalsResponse,
  AdminSearchResult,
  AdminStaffDto,
  AdminStatsDto,
} from "@/lib/admin/types";
import type { AuthUserProfile } from "@/lib/auth/getOrCreateUser";
import type { NotificationPrefs } from "@/lib/auth/notificationPrefs";
import type {
  CreateDocumentRequest,
} from "@/lib/documents/validation";
import type {
  DocumentDto,
  DownloadUrlResponse,
  UploadUrlResponse,
} from "@/lib/documents/types";
import type { NotificationDto } from "@/lib/notifications/types";
import type { RenewalDto } from "@/lib/renewals/types";
import type {
  AcceptHouseholdResponse,
  HouseholdDto,
  InviteHouseholdResponse,
} from "@/lib/household/types";
import type {
  CreateVehicleInput,
  PatchVehicleInput,
  VehicleDto,
} from "@/lib/vehicles/types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function apiFetch<T>(
  path: string,
  options: {
    method?: string;
    token: string;
    body?: unknown;
  },
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${options.token}`,
      ...(options.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }

  return (await response.json()) as T;
}

export async function fetchMe(
  token: string,
  extras?: { name?: string; phone?: string },
): Promise<AuthUserProfile> {
  const hasExtras = Boolean(extras?.name || extras?.phone);
  const data = await apiFetch<{ user: AuthUserProfile }>("/api/me", {
    method: hasExtras ? "POST" : "GET",
    token,
    body: hasExtras ? extras : undefined,
  });
  return data.user;
}

export async function updateMe(
  token: string,
  patch: {
    name?: string | null;
    phone?: string | null;
    notificationPrefs?: Partial<NotificationPrefs>;
  },
): Promise<AuthUserProfile> {
  const data = await apiFetch<{ user: AuthUserProfile }>("/api/me", {
    method: "PATCH",
    token,
    body: patch,
  });
  return data.user;
}

export async function registerPushDeviceToken(
  authToken: string,
  fcmToken: string,
): Promise<{ ok: true; id: string; created: boolean }> {
  return apiFetch("/api/push/register", {
    method: "POST",
    token: authToken,
    body: { token: fcmToken },
  });
}

export async function unregisterPushDeviceToken(
  authToken: string,
  fcmToken: string,
): Promise<{ ok: true; deleted: boolean }> {
  return apiFetch("/api/push/token", {
    method: "DELETE",
    token: authToken,
    body: { token: fcmToken },
  });
}

export type VinDecodeApiSuccess = {
  ok: true;
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  bodyClass: string | null;
};

export type VinDecodeApiFailure = {
  ok: false;
  soft: true;
  error: string;
  vin: string | null;
};

export async function decodeVinApi(
  token: string,
  vin: string,
): Promise<VinDecodeApiSuccess | VinDecodeApiFailure> {
  return apiFetch<VinDecodeApiSuccess | VinDecodeApiFailure>(
    "/api/vin/decode",
    {
      method: "POST",
      token,
      body: { vin },
    },
  );
}

export async function listVehicles(token: string): Promise<VehicleDto[]> {
  const data = await apiFetch<{ vehicles: VehicleDto[] }>("/api/vehicles", {
    token,
  });
  return data.vehicles;
}

export async function createVehicle(
  token: string,
  input: CreateVehicleInput,
): Promise<VehicleDto> {
  const data = await apiFetch<{ vehicle: VehicleDto }>("/api/vehicles", {
    method: "POST",
    token,
    body: input,
  });
  return data.vehicle;
}

export async function getVehicle(
  token: string,
  id: string,
): Promise<VehicleDto> {
  const data = await apiFetch<{ vehicle: VehicleDto }>(`/api/vehicles/${id}`, {
    token,
  });
  return data.vehicle;
}

export async function updateVehicle(
  token: string,
  id: string,
  patch: PatchVehicleInput,
): Promise<VehicleDto> {
  const data = await apiFetch<{ vehicle: VehicleDto }>(`/api/vehicles/${id}`, {
    method: "PATCH",
    token,
    body: patch,
  });
  return data.vehicle;
}

export async function deleteVehicle(
  token: string,
  id: string,
): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/vehicles/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function joinWaitlist(
  token: string,
  input: { email?: string; state: string },
): Promise<void> {
  await apiFetch("/api/waitlist", {
    method: "POST",
    token,
    body: input,
  });
}

export type ActiveStateDto = {
  code: string;
  name: string;
  dueSoonThresholdDays: number;
};

export async function listActiveStates(
  token: string,
): Promise<ActiveStateDto[]> {
  const data = await apiFetch<{ states: ActiveStateDto[] }>("/api/states", {
    token,
  });
  return data.states;
}

export async function listNotifications(
  token: string,
  limit = 10,
): Promise<NotificationDto[]> {
  const params = new URLSearchParams({
    limit: String(limit),
  });
  const data = await apiFetch<{ notifications: NotificationDto[] }>(
    `/api/notifications?${params}`,
    { token },
  );
  return data.notifications;
}

export async function listDocuments(
  token: string,
  vehicleId: string,
): Promise<DocumentDto[]> {
  const params = new URLSearchParams({ vehicleId });
  const data = await apiFetch<{ documents: DocumentDto[] }>(
    `/api/documents?${params}`,
    { token },
  );
  return data.documents;
}

export async function requestDocumentUploadUrl(
  token: string,
  input: {
    vehicleId: string;
    filename: string;
    contentType: string;
    contentLength: number;
  },
): Promise<UploadUrlResponse> {
  return apiFetch<UploadUrlResponse>("/api/documents/upload-url", {
    method: "POST",
    token,
    body: input,
  });
}

/**
 * Confirm a completed GCS PUT and create the vault row.
 * Pass renewalId during concierge uploads so docs land in the vault + renewal.
 */
export async function confirmDocumentUpload(
  token: string,
  input: CreateDocumentRequest,
): Promise<DocumentDto> {
  const data = await apiFetch<{ document: DocumentDto }>("/api/documents", {
    method: "POST",
    token,
    body: input,
  });
  return data.document;
}

export async function listRenewals(
  token: string,
  vehicleId: string,
): Promise<RenewalDto[]> {
  const params = new URLSearchParams({ vehicleId });
  const data = await apiFetch<{ renewals: RenewalDto[] }>(
    `/api/renewals?${params}`,
    { token },
  );
  return data.renewals;
}

export async function getRenewal(
  token: string,
  renewalId: string,
): Promise<RenewalDto> {
  const data = await apiFetch<{ renewal: RenewalDto }>(
    `/api/renewals/${renewalId}`,
    { token },
  );
  return data.renewal;
}

export async function createRenewal(
  token: string,
  input: { vehicleId: string; county?: string | null },
): Promise<{ renewal: RenewalDto; resumed: boolean }> {
  return apiFetch<{ renewal: RenewalDto; resumed: boolean }>("/api/renewals", {
    method: "POST",
    token,
    body: input,
  });
}

export async function submitRenewal(
  token: string,
  renewalId: string,
): Promise<RenewalDto> {
  const data = await apiFetch<{ renewal: RenewalDto }>(
    `/api/renewals/${renewalId}/submit`,
    { method: "POST", token },
  );
  return data.renewal;
}

export async function getDocumentDownloadUrl(
  token: string,
  documentId: string,
): Promise<DownloadUrlResponse> {
  return apiFetch<DownloadUrlResponse>(
    `/api/documents/${documentId}/download`,
    { token },
  );
}

export async function deleteDocument(
  token: string,
  documentId: string,
): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/documents/${documentId}`, {
    method: "DELETE",
    token,
  });
}

// ─── Household sharing ──────────────────────────────────────────────────────

export async function listHouseholds(
  token: string,
): Promise<HouseholdDto[]> {
  const data = await apiFetch<{ households: HouseholdDto[] }>(
    "/api/household",
    { token },
  );
  return data.households;
}

export async function inviteHouseholdMember(
  token: string,
  input: { email: string; householdId?: string },
): Promise<InviteHouseholdResponse> {
  return apiFetch<InviteHouseholdResponse>("/api/household/invite", {
    method: "POST",
    token,
    body: input,
  });
}

export async function acceptHouseholdInvite(
  token: string,
  tokenValue: string,
): Promise<AcceptHouseholdResponse> {
  return apiFetch<AcceptHouseholdResponse>("/api/household/accept", {
    method: "POST",
    token,
    body: { token: tokenValue },
  });
}

export async function removeHouseholdMember(
  token: string,
  memberId: string,
): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/household/members/${memberId}`, {
    method: "DELETE",
    token,
  });
}

// ─── Admin (staff-only) ─────────────────────────────────────────────────────

export async function fetchAdminMe(token: string): Promise<AdminStaffDto> {
  const data = await apiFetch<{ staff: AdminStaffDto }>("/api/admin/me", {
    token,
  });
  return data.staff;
}

export async function adminSearch(
  token: string,
  q: string,
): Promise<AdminSearchResult> {
  const params = new URLSearchParams({ q });
  return apiFetch<AdminSearchResult>(`/api/admin/search?${params}`, { token });
}

export async function adminListRenewals(
  token: string,
  status?: string,
): Promise<AdminRenewalsResponse> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();
  return apiFetch<AdminRenewalsResponse>(
    `/api/admin/renewals${qs ? `?${qs}` : ""}`,
    { token },
  );
}

export async function adminGetRenewal(
  token: string,
  renewalId: string,
): Promise<AdminRenewalDetailResponse["renewal"]> {
  const data = await apiFetch<AdminRenewalDetailResponse>(
    `/api/admin/renewals/${renewalId}`,
    { token },
  );
  return data.renewal;
}

export async function adminUpdateRenewalStatus(
  token: string,
  renewalId: string,
  status: RenewalStatus,
): Promise<{
  previousStatus: RenewalStatus;
  newStatus: RenewalStatus;
}> {
  return apiFetch(`/api/admin/renewals/${renewalId}/status`, {
    method: "POST",
    token,
    body: { status },
  });
}

export async function adminAddRenewalNote(
  token: string,
  renewalId: string,
  note: string,
): Promise<{ staffNotes: string | null }> {
  return apiFetch(`/api/admin/renewals/${renewalId}/notes`, {
    method: "POST",
    token,
    body: { note },
  });
}

export async function adminResendRenewalEmail(
  token: string,
  renewalId: string,
): Promise<{ ok: true; templateKey: string; to: string; status: RenewalStatus }> {
  return apiFetch(`/api/admin/renewals/${renewalId}/resend-email`, {
    method: "POST",
    token,
  });
}

export async function adminGetStats(token: string): Promise<AdminStatsDto> {
  return apiFetch<AdminStatsDto>("/api/admin/stats", { token });
}

/** PUT file bytes directly to the private GCS signed URL. */
export async function putFileToSignedUrl(
  uploadUrl: string,
  file: Blob,
  requiredHeaders: Record<string, string>,
  onProgress?: (percent: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    for (const [key, value] of Object.entries(requiredHeaders)) {
      xhr.setRequestHeader(key, value);
    }
    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(
        new ApiError(
          `Upload to storage failed (${xhr.status})`,
          xhr.status || 500,
        ),
      );
    };
    xhr.onerror = () => {
      reject(new ApiError("Upload to storage failed (network error)", 0));
    };
    xhr.send(file);
  });
}
