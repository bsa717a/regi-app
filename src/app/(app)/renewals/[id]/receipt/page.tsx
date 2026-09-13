import { RenewalReceiptClient } from "@/components/renewals/RenewalReceiptClient";
import { FeatureErrorBoundary } from "@/components/sentry/FeatureErrorBoundary";

export default async function RenewalReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <FeatureErrorBoundary feature="renewal-receipt">
      <RenewalReceiptClient renewalId={id} />
    </FeatureErrorBoundary>
  );
}
