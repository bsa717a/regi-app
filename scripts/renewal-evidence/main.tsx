import { createRoot } from "react-dom/client";
import { RenewalHistoryList } from "@/components/renewals/RenewalHistoryList";
import { RenewalReceipt } from "@/components/renewals/RenewalReceipt";
import { exampleRenewal } from "@/lib/renewals/exampleRenewal";
import { buildRenewalProof } from "@/lib/renewals/proof";
import "./evidence.css";

const mailed = exampleRenewal();
const open = exampleRenewal({
  id: "ren_open_1",
  status: "Reviewing",
  proofAvailable: false,
  timestamps: {
    ...mailed.timestamps,
    processingAt: null,
    submittedAt: null,
    completedAt: null,
    stickerMailedAt: null,
  },
});

createRoot(document.getElementById("root")!).render(
  <main className="mx-auto w-full max-w-3xl space-y-10 bg-slate-50 px-4 py-6">
    <section data-testid="evidence-history">
      <p className="text-sm font-medium text-teal-800">Concierge history</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
        Mom&apos;s Tahoe
      </h1>
      <p className="mt-2 mb-4 text-base text-slate-600">
        Past and in-progress renewals. Confirmation is ready after the sticker
        is mailed.
      </p>
      <RenewalHistoryList renewals={[mailed, open]} />
    </section>

    <section data-testid="evidence-receipt">
      <RenewalReceipt
        proof={buildRenewalProof(mailed)}
        documents={mailed.documents}
      />
    </section>
  </main>,
);
