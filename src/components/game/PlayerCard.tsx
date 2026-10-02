"use client";

import Link from "next/link";
import { useState } from "react";
import { badges } from "@/lib/game/badges";
import { dayStreak, levelInfo, resetProgress, useProgress } from "@/lib/game/progress";
import { tr, useLang, useT } from "@/lib/i18n/lang";

/** Level, XP, daily streak and badges. `compact` is the start-page version. */
export default function PlayerCard({ compact = false }: { compact?: boolean }) {
  const progress = useProgress();
  const lang = useLang();
  const t = useT();
  const [showBadges, setShowBadges] = useState(!compact);
  const lvl = levelInfo(progress.xp);
  const streak = dayStreak(progress.days);
  const earned = badges.filter((b) => progress.badges[b.id]);

  return (
    <section aria-label={t("Your progress", "Dein Fortschritt")} className="flex flex-col gap-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-accent text-accent-contrast">
          <span className="text-[0.6rem] font-medium uppercase tracking-wide opacity-80">Level</span>
          <span className="text-xl font-bold leading-none">{lvl.level}</span>
        </div>
        <div className="min-w-48 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-semibold">{tr(lang, lvl.title)}</p>
            <p className="text-sm text-muted">
              <span className="font-mono text-foreground">{progress.xp}</span> XP
              {lvl.nextTitle && <> · {lvl.toNext} XP {t("to", "bis")} {tr(lang, lvl.nextTitle)}</>}
            </p>
          </div>
          <div
            className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface ring-1 ring-border"
            role="progressbar"
            aria-label={t("Progress to next level", "Fortschritt bis zum nächsten Level")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(lvl.progress * 100)}
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${lvl.progress * 100}%` }} />
          </div>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="rounded-lg border border-border px-3 py-1.5" title={t("Days in a row with practice", "Tage in Folge mit Übung")}>
            🔥 <strong>{streak}</strong> {streak === 1 ? t("day", "Tag") : t("days", "Tage")}
          </span>
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-1.5 transition hover:border-accent"
            aria-expanded={showBadges}
            onClick={() => setShowBadges(!showBadges)}
          >
            🏅 <strong>{earned.length}</strong>/{badges.length} {t("badges", "Abzeichen")}
          </button>
          {compact && (
            <Link href="/tools/practice" className="whitespace-nowrap rounded-lg bg-accent px-3 py-1.5 font-medium text-accent-contrast hover:opacity-90">
              {t("Practise", "Üben")} ▸
            </Link>
          )}
        </div>
      </div>

      {showBadges && (
        <div className="flex flex-col gap-3">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {badges.map((b) => {
              const date = progress.badges[b.id];
              return (
                <li
                  key={b.id}
                  className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm ${
                    date ? "border-accent/40 bg-accent/5" : "border-border opacity-55 grayscale"
                  }`}
                  title={date ? t(`Earned on ${date}`, `Erhalten am ${date}`) : t("Not earned yet", "Noch nicht erhalten")}
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {b.icon}
                  </span>
                  <span>
                    <span className="block font-medium">{tr(lang, b.title)}</span>
                    <span className="block text-xs text-muted">{tr(lang, b.description)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          {!compact && progress.xp > 0 && (
            <button
              type="button"
              className="self-start text-xs text-muted underline decoration-border underline-offset-2 hover:text-danger"
              onClick={() => window.confirm(t("Reset all XP, streaks and badges on this device?", "Alle XP, Serien und Abzeichen auf diesem Gerät zurücksetzen?")) && resetProgress()}
            >
              {t("Reset progress", "Fortschritt zurücksetzen")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
