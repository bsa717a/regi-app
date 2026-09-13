import { ConciergeClient } from "@/components/renewals/ConciergeClient";
import { FeatureErrorBoundary } from "@/components/sentry/FeatureErrorBoundary";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Renewal");

export default async function RenewalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <FeatureErrorBoundary feature="renewal-concierge">
      <ConciergeClient renewalId={id} />
    </FeatureErrorBoundary>
  );
}
