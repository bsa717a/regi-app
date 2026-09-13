import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Admin");

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
