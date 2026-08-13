import { RecallsClient } from "@/components/garage/RecallsClient";

export default async function GarageRecallsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecallsClient registrationId={id} />;
}
