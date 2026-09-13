import { RecallsClient } from "@/components/garage/RecallsClient";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Recalls");

export default async function GarageRecallsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecallsClient registrationId={id} />;
}
