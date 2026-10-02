import { GarageClient } from "@/components/garage/GarageClient";
import { FeatureErrorBoundary } from "@/components/sentry/FeatureErrorBoundary";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Your Garage");

export default function GaragePage() {
  return (
    <FeatureErrorBoundary feature="garage-upload">
      <GarageClient />
    </FeatureErrorBoundary>
  );
}
