import { AppShell } from "@/components/shell/AppShell";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { pageMetadata } from "@/lib/seo/pageTitle";

export const metadata = pageMetadata("Settings");

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <SettingsPanel />
    </AppShell>
  );
}
