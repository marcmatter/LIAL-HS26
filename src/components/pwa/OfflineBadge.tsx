"use client";

import { useOnline } from "./useOnline";

export default function OfflineBadge() {
  const online = useOnline();
  if (online) return null;
  return (
    <span
      role="status"
      title="No internet connection — all tools keep working offline."
      className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium text-muted"
    >
      ● Offline
    </span>
  );
}
