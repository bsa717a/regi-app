import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Renewals");

export default function RenewalsPage() {
  return <DashboardClient />;
}
