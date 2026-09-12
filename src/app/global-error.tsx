"use client";

import { useEffect } from "react";
import { captureException } from "@/lib/sentry/report";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, {
      tags: { boundary: "global" },
      extras: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="mx-auto flex min-h-screen max-w-lg flex-col justify-center bg-slate-50 px-6 text-slate-900">
        <h1 className="text-2xl font-semibold">REGI hit an unexpected error</h1>
        <p className="mt-2 text-slate-600">
          Please try again. If this keeps happening, refresh the page.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex w-fit rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
