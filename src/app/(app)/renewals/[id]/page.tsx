import { ConciergeClient } from "@/components/renewals/ConciergeClient";

export default async function RenewalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConciergeClient renewalId={id} />;
}
