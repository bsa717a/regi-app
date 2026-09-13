import { MaintenanceClient } from "@/components/garage/MaintenanceClient";
import { FeatureErrorBoundary } from "@/components/sentry/FeatureErrorBoundary";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Maintenance");

export default async function GarageMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <FeatureErrorBoundary feature="garage-upload">
      <MaintenanceClient registrationId={id} />
    </FeatureErrorBoundary>
  );
}
