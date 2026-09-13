import { redirect } from "next/navigation";
import { adminTabHref } from "@/components/admin/adminTabs";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Admin users");

export default function AdminUsersPage() {
  redirect(adminTabHref("users"));
}
