import { createRoot } from "react-dom/client";
import { GarageEmptyState } from "@/components/garage/GarageEmptyState";
import "./evidence.css";

createRoot(document.getElementById("root")!).render(
  <div className="min-h-screen">
    <div
      id="garage-empty-light"
      className="bg-[linear-gradient(180deg,#f0fdfa_0%,#f8fafc_28%,#f8fafc_100%)] px-4 py-5"
    >
      <header className="mx-auto mb-4 max-w-3xl border-b border-slate-200/70 bg-white/90 px-1 pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
          REGI
        </p>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          Garage
        </h1>
      </header>
      <main className="mx-auto w-full max-w-3xl">
        <GarageEmptyState onScanCard={() => undefined} onEnterVin={() => undefined} />
      </main>
    </div>

    <div
      id="garage-empty-dark"
      className="dark bg-[linear-gradient(180deg,#042f2e_0%,#020617_28%,#020617_100%)] px-4 py-5 text-slate-100"
    >
      <header className="mx-auto mb-4 max-w-3xl border-b border-slate-700/70 bg-slate-900/90 px-1 pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
          REGI
        </p>
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">
          Garage
        </h1>
      </header>
      <main className="mx-auto w-full max-w-3xl">
        <GarageEmptyState onScanCard={() => undefined} onEnterVin={() => undefined} />
      </main>
    </div>
  </div>,
);
