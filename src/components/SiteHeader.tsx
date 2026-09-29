import Link from "next/link";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import OfflineBadge from "@/components/pwa/OfflineBadge";
import { SiteSubtitle } from "@/components/ToolList";

export default function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          LIAL <SiteSubtitle />
        </Link>
        <div className="flex items-center gap-2">
          <OfflineBadge />
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
