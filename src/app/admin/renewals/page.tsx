import { redirect } from "next/navigation";
import { adminTabHref } from "@/components/admin/adminTabs";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Admin queue");

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminRenewalsPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  redirect(
    status
      ? adminTabHref("queue", { status })
      : adminTabHref("queue"),
  );
}
