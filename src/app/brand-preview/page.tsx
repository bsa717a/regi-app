import { notFound } from "next/navigation";
import { BrandPreview } from "@/app/brand-preview/preview";

export const metadata = {
  title: "Brand preview",
  robots: { index: false, follow: false },
};

export default function BrandPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <BrandPreview />;
}
