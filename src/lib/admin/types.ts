import type { RenewalStatus, StaffRole } from "@prisma/client";
import type { AdminSearchResult } from "./search";
import type { AdminRenewalDetail, AdminRenewalListItem } from "./serialize";

export type AdminStaffDto = {
  id: string;
  firebaseUid: string;
  name: string;
  role: StaffRole;
};

export type AdminStatsDto = {
  byStatus: Record<RenewalStatus, number>;
  overdueCount: number;
  activeQueueCount: number;
  total: number;
};

export type AdminRenewalsResponse = {
  filter: string;
  renewals: AdminRenewalListItem[];
};

export type AdminRenewalDetailResponse = {
  renewal: AdminRenewalDetail;
};

export type { AdminSearchResult, AdminRenewalDetail, AdminRenewalListItem };
