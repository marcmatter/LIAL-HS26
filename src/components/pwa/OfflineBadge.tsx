"use client";

import { useOnline } from "./useOnline";
import { useT } from "@/lib/i18n/lang";

export default function OfflineBadge() {
  const online = useOnline();
  const t = useT();
  if (online) return null;
  return (
    <span
      role="status"
      title={t("No internet connection — all tools keep working offline.", "Keine Internetverbindung — alle Werkzeuge funktionieren weiterhin offline.")}
      className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium text-muted"
    >
      ● Offline
    </span>
  );
}
