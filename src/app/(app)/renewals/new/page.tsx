import { StartRenewalClient } from "@/components/renewals/StartRenewalClient";

export default async function NewRenewalPage({
  searchParams,
}: {
  searchParams: Promise<{ registrationId?: string }>;
}) {
  const params = await searchParams;
  const registrationId = params.registrationId?.trim();

  if (!registrationId) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-3xl flex-col justify-center px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">
          Choose a registration
        </h1>
        <p className="mt-2 text-slate-600">
          Open Renew from your dashboard or garage to start the concierge flow.
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-flex w-fit rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white"
        >
          Go to dashboard
        </a>
      </main>
    );
  }

  return <StartRenewalClient registrationId={registrationId} />;
}
