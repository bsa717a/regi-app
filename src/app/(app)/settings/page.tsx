import { AppShell } from "@/components/shell/AppShell";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <SettingsPanel />
    </AppShell>
  );
}
