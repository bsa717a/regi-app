export function GarageEmptyState({
  onScanCard,
  onEnterVin,
}: {
  onScanCard: () => void;
  onEnterVin: () => void;
}) {
  return (
    <section
      className="flex min-h-[62vh] flex-col items-center justify-center px-2 text-center"
      data-testid="garage-empty-state"
      aria-labelledby="garage-empty-heading"
    >
      <h2
        id="garage-empty-heading"
        className="font-regi-display text-[32px] leading-[1.15] font-bold tracking-[-0.02em] text-regi-text"
      >
        Your garage is empty
      </h2>
      <p className="mt-4 max-w-xs text-base leading-relaxed text-regi-muted">
        Add a vehicle and REGI takes it from there — tracking the expiry,
        telling you what is required, and handling the renewal.
      </p>
      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-[6px] bg-regi-accent px-4 py-3.5 text-base font-medium text-regi-ground transition hover:bg-regi-accent-pressed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-regi-accent"
          onClick={onScanCard}
          data-testid="add-first-registration-button"
        >
          Scan a registration card
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-[6px] border border-regi-line bg-transparent px-4 py-3.5 text-base font-medium text-regi-text transition hover:bg-regi-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-regi-accent"
          onClick={onEnterVin}
          data-testid="enter-vin-button"
        >
          Enter a VIN instead
        </button>
      </div>
    </section>
  );
}
