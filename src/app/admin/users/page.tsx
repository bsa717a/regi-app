import { redirect } from "next/navigation";
import { adminTabHref } from "@/components/admin/adminTabs";

export default function AdminUsersPage() {
  redirect(adminTabHref("users"));
}
