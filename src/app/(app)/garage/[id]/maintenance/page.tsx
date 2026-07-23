import { MaintenanceClient } from "@/components/garage/MaintenanceClient";

export default async function GarageMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MaintenanceClient registrationId={id} />;
}
