"use client";

import { useEffect } from "react";
import { setLang, useLang, type Lang } from "@/lib/i18n/lang";

const options: { value: Lang; label: string; title: string }[] = [
  { value: "en", label: "EN", title: "English" },
  { value: "de", label: "DE", title: "Deutsch" },
];

export default function LanguageToggle() {
  const lang = useLang();

  // Keep <html lang> in sync (screen readers, hyphenation, spell checking).
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div role="radiogroup" aria-label="Language / Sprache" className="inline-flex rounded-lg border border-border p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={lang === o.value}
          title={o.title}
          className={`rounded-md px-2 py-1 font-semibold transition ${
            lang === o.value ? "bg-accent text-accent-contrast" : "text-muted hover:text-foreground"
          }`}
          onClick={() => setLang(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
