import { UtahPlatesPage } from "@/components/plates/UtahPlatesPage";

export default async function GaragePlatesPage({
  searchParams,
}: {
  searchParams: Promise<{ registrationId?: string }>;
}) {
  const params = await searchParams;
  const registrationId = params.registrationId?.trim();
  return <UtahPlatesPage registrationId={registrationId} />;
}
