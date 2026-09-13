import { UtahPlatesPage } from "@/components/plates/UtahPlatesPage";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Order plates");

export default async function GaragePlatesPage({
  searchParams,
}: {
  searchParams: Promise<{ registrationId?: string }>;
}) {
  const params = await searchParams;
  const registrationId = params.registrationId?.trim();
  return <UtahPlatesPage registrationId={registrationId} />;
}
