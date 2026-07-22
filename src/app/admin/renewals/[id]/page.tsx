import { RenewalDetailClient } from "@/components/admin/RenewalDetailClient";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminRenewalDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <RenewalDetailClient renewalId={id} />;
}
