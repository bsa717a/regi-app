import { redirect } from "next/navigation";
import { adminTabHref } from "@/components/admin/adminTabs";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Admin search");

export default function AdminSearchPage() {
  redirect(adminTabHref("search"));
}
