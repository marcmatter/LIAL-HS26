"use client";

import Link from "next/link";
import { useDocumentTitle } from "@/components/i18n/useDocumentTitle";
import { tr, useLang, useT } from "@/lib/i18n/lang";
import { categoryLabels, tools, type ToolCategory } from "@/tools/registry";

const categories: ToolCategory[] = ["practice", "vectors-matrices", "systems"];

export function HomeIntro() {
  const t = useT();
  useDocumentTitle(t("LIAL · Linear Algebra Tools", "LIAL · Lineare-Algebra-Werkzeuge"));
  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">{t("Linear Algebra Tools", "Lineare-Algebra-Werkzeuge")}</h1>
      <p className="mt-2 text-muted">
        {t("Interactive helper tools for the Linear Algebra course (LIAL).", "Interaktive Hilfsmittel für den Kurs Lineare Algebra (LIAL).")}
      </p>
    </section>
  );
}

export default function ToolList() {
  const lang = useLang();
  return (
    <>
      {categories.map((category) => {
        const items = tools.filter((tool) => tool.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{tr(lang, categoryLabels[category])}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={`/tools/${tool.slug}`}
                    className="flex h-full flex-col gap-1 rounded-lg border border-border bg-surface p-4 transition hover:border-accent"
                  >
                    <span className="font-medium">{tr(lang, tool.title)}</span>
                    <span className="text-sm text-muted">{tr(lang, tool.description)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

export function ToolHeader({ slug }: { slug: string }) {
  const lang = useLang();
  const t = useT();
  const tool = tools.find((x) => x.slug === slug);
  useDocumentTitle(tool ? `${tr(lang, tool.title)} · LIAL` : null);
  if (!tool) return null;
  return (
    <>
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← {t("All tools", "Alle Werkzeuge")}
      </Link>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">{tr(lang, categoryLabels[tool.category])}</p>
        <h1 className="text-3xl font-bold tracking-tight">{tr(lang, tool.title)}</h1>
        <p className="mt-2 text-muted">{tr(lang, tool.description)}</p>
      </header>
    </>
  );
}

export function NotFoundText() {
  const t = useT();
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-bold">{t("Page not found", "Seite nicht gefunden")}</h1>
      <Link href="/" className="text-accent hover:underline">
        {t("Back to all tools", "Zurück zu allen Werkzeugen")}
      </Link>
    </div>
  );
}

export function SiteSubtitle() {
  const t = useT();
  return <span className="font-normal text-muted">· {t("Linear Algebra Tools", "Lineare-Algebra-Werkzeuge")}</span>;
}
