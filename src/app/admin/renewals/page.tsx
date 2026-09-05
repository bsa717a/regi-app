import { redirect } from "next/navigation";
import { adminTabHref } from "@/components/admin/adminTabs";

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
