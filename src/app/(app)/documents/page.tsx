import { DocumentsClient } from "@/components/documents/DocumentsClient";
import { FeatureErrorBoundary } from "@/components/sentry/FeatureErrorBoundary";

export default function DocumentsPage() {
  return (
    <FeatureErrorBoundary feature="document-upload">
      <DocumentsClient />
    </FeatureErrorBoundary>
  );
}
