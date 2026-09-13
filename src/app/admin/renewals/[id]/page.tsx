import { RenewalDetailClient } from "@/components/admin/RenewalDetailClient";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Admin renewal");

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminRenewalDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <RenewalDetailClient renewalId={id} />;
}
