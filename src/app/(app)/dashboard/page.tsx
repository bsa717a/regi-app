import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Dashboard");

/** Legacy route — Renewals inbox lives at /renewals. */
export default function DashboardRedirectPage() {
  redirect("/renewals");
}
