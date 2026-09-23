import type { RegistrationStatus } from "@/lib/stateEngine/status";
import { StatusInline } from "@/components/brand/ui";

export function StatusBadge({ status }: { status: RegistrationStatus }) {
  return <StatusInline status={status} />;
}
