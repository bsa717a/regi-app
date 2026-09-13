import { RenewalHistoryClient } from "@/components/garage/RenewalHistoryClient";
import { FeatureErrorBoundary } from "@/components/sentry/FeatureErrorBoundary";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Renewal history");

export default async function GarageRenewalHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <FeatureErrorBoundary feature="renewal-history">
      <RenewalHistoryClient registrationId={id} />
    </FeatureErrorBoundary>
  );
}
