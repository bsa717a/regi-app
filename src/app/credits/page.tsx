import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { pageMetadata } from "@/lib/seo/pageTitle";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("Photo credits");

export default async function PhotoCreditsPage() {
  let credits: Array<{
    id: string;
    displayMake: string;
    displayModel: string;
    yearFrom: number;
    yearTo: number;
    generationLabel: string;
    author: string | null;
    license: string | null;
    licenseUrl: string | null;
    sourceUrl: string | null;
    shareAlike: boolean;
    retrievedAt: Date | null;
  }> = [];
  try {
    credits = await prisma.vehicleCatalogImage.findMany({
      where: { status: "ready" },
      orderBy: [{ displayMake: "asc" }, { displayModel: "asc" }, { yearFrom: "asc" }],
      take: 200,
    });
  } catch {
    credits = [];
  }

  return (
    <LegalPageShell title="Photo credits">
      <p>
        Garage cards use a photo of that vehicle&apos;s own make, model, and
        generation when we can store one under a free license. These files are
        kept as REGI assets. CC BY and CC BY-SA images keep their attribution.
        CC BY-SA also stays share-alike: a crop does not change the license,
        and reuse has to stay under that same license with credit.
      </p>
      <LegalSection title="Licensed vehicle photos">
        {credits.length === 0 ? (
          <p>No catalog photos have been stored yet.</p>
        ) : (
          <ul className="space-y-4">
            {credits.map((row) => (
              <li key={row.id}>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {row.yearFrom === row.yearTo
                    ? row.yearFrom
                    : `${row.yearFrom}–${row.yearTo}`}{" "}
                  {row.displayMake} {row.displayModel}
                </p>
                <p className="text-sm">{row.generationLabel}</p>
                <p className="text-sm">
                  {row.author ?? "Unknown author"}
                  {" · "}
                  {row.licenseUrl ? (
                    <a href={row.licenseUrl} rel="license" className="underline-offset-2 hover:underline">
                      {row.license}
                    </a>
                  ) : (
                    row.license
                  )}
                  {row.shareAlike ? " · Share-alike" : ""}
                  {row.sourceUrl ? (
                    <>
                      {" · "}
                      <a
                        href={row.sourceUrl}
                        rel="noopener noreferrer"
                        className="underline-offset-2 hover:underline"
                      >
                        Source
                      </a>
                    </>
                  ) : null}
                  {row.retrievedAt
                    ? ` · Retrieved ${row.retrievedAt.toISOString().slice(0, 10)}`
                    : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </LegalSection>
      <p className="mt-8 text-sm">
        <Link href="/garage" className="font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300">
          Back to the garage
        </Link>
      </p>
    </LegalPageShell>
  );
}
