import { DocumentsClient } from "@/components/documents/DocumentsClient";
import { FeatureErrorBoundary } from "@/components/sentry/FeatureErrorBoundary";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Documents");

export default function DocumentsPage() {
  return (
    <FeatureErrorBoundary feature="document-upload">
      <DocumentsClient />
    </FeatureErrorBoundary>
  );
}
