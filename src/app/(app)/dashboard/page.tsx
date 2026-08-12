import { redirect } from "next/navigation";

/** Legacy route — Renewals inbox lives at /renewals. */
export default function DashboardRedirectPage() {
  redirect("/renewals");
}
