import { GarageClient } from "@/components/garage/GarageClient";
import { FeatureErrorBoundary } from "@/components/sentry/FeatureErrorBoundary";

export default function GaragePage() {
  return (
    <FeatureErrorBoundary feature="garage-upload">
      <GarageClient />
    </FeatureErrorBoundary>
  );
}
