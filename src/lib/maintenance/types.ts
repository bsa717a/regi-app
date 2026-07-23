export type MaintenanceDueStatus = "ok" | "due_soon" | "overdue";

export type MaintenanceTaskDto = {
  id: string;
  registrationId: string;
  name: string;
  presetKey: string | null;
  intervalMonths: number | null;
  intervalHours: number | null;
  intervalMiles: number | null;
  notes: string | null;
  /** One-shot reminder date (YYYY-MM-DD), if set. */
  remindOn: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  status: MaintenanceDueStatus;
  /** Human-readable reason for current status. */
  statusDetail: string;
  lastPerformedOn: string | null;
  lastHoursAtService: number | null;
  lastMilesAtService: number | null;
};

export type MaintenanceLogDto = {
  id: string;
  registrationId: string;
  taskId: string | null;
  taskName: string | null;
  performedOn: string;
  hoursAtService: number | null;
  milesAtService: number | null;
  costCents: number | null;
  notes: string | null;
  /** Signed URL for receipt photo when present. */
  receiptUrl: string | null;
  receiptFilename: string | null;
  createdAt: string;
};

export type ReceiptScanDto = {
  performedOn: string | null;
  hoursAtService: number | null;
  milesAtService: number | null;
  costDollars: number | null;
  notes: string | null;
  shopName: string | null;
  confidence: number | null;
};

export type UsageReadingDto = {
  id: string;
  registrationId: string;
  readingOn: string;
  hours: number | null;
  miles: number | null;
  createdAt: string;
};

export type MaintenanceOverviewDto = {
  registrationId: string;
  registrationType: string;
  vehicleName: string;
  canEdit: boolean;
  latestUsage: UsageReadingDto | null;
  tasks: MaintenanceTaskDto[];
  logs: MaintenanceLogDto[];
  presets: Array<{
    key: string;
    name: string;
    intervalMonths?: number;
    intervalHours?: number;
    intervalMiles?: number;
    notes?: string;
    alreadyAdded: boolean;
  }>;
};

export type CreateMaintenanceTaskInput = {
  name?: string;
  presetKey?: string;
  intervalMonths?: number | null;
  intervalHours?: number | null;
  intervalMiles?: number | null;
  notes?: string | null;
  /** Schedule a one-shot email reminder this many days from today. */
  remindInDays?: number | null;
};

export type PatchMaintenanceTaskInput = {
  name?: string;
  intervalMonths?: number | null;
  intervalHours?: number | null;
  intervalMiles?: number | null;
  notes?: string | null;
  active?: boolean;
  /** Schedule a one-shot email reminder this many days from today. */
  remindInDays?: number | null;
  /** Clear any scheduled one-shot reminder. */
  clearRemind?: boolean;
};

export type CreateMaintenanceLogInput = {
  taskId?: string | null;
  performedOn: string;
  hoursAtService?: number | null;
  milesAtService?: number | null;
  costCents?: number | null;
  notes?: string | null;
};

export type CreateUsageReadingInput = {
  readingOn?: string;
  hours?: number | null;
  miles?: number | null;
};
