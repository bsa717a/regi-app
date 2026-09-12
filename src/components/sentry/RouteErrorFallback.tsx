"use client";

import { useEffect } from "react";
import { primaryButtonClassName } from "@/components/auth/AuthFormStyles";
import { captureException } from "@/lib/sentry/report";

export function RouteErrorFallback({
  error,
  reset,
  title = "Something went wrong",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  useEffect(() => {
    captureException(error, {
      tags: { boundary: "route" },
      extras: { digest: error.digest },
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-3xl flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        This screen hit an unexpected error. Try again, or go back and reopen
        it.
      </p>
      <button
        type="button"
        onClick={reset}
        className={`${primaryButtonClassName} mt-6 w-auto min-w-32`}
      >
        Try again
      </button>
    </main>
  );
}
