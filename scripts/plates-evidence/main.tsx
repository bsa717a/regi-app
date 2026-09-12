import { createRoot } from "react-dom/client";
import { UtahPersonalizedPlateFlow } from "@/components/plates/UtahPersonalizedPlateFlow";
import "./evidence.css";

createRoot(document.getElementById("root")!).render(
  <main className="mx-auto w-full max-w-3xl bg-slate-50 px-4 py-5">
    <UtahPersonalizedPlateFlow />
  </main>,
);
