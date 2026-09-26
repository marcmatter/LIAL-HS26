"use client";

import Link from "next/link";
import { useState } from "react";
import { badges } from "@/lib/game/badges";
import { dayStreak, levelInfo, resetProgress, useProgress } from "@/lib/game/progress";

/** Level, XP, daily streak and badges. `compact` is the start-page version. */
export default function PlayerCard({ compact = false }: { compact?: boolean }) {
  const progress = useProgress();
  const [showBadges, setShowBadges] = useState(!compact);
  const lvl = levelInfo(progress.xp);
  const streak = dayStreak(progress.days);
  const earned = badges.filter((b) => progress.badges[b.id]);

  return (
    <section aria-label="Your progress" className="flex flex-col gap-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-accent text-accent-contrast">
          <span className="text-[0.6rem] font-medium uppercase tracking-wide opacity-80">Level</span>
          <span className="text-xl font-bold leading-none">{lvl.level}</span>
        </div>
        <div className="min-w-48 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-semibold">{lvl.title}</p>
            <p className="text-sm text-muted">
              <span className="font-mono text-foreground">{progress.xp}</span> XP
              {lvl.nextTitle && <> · {lvl.toNext} XP to {lvl.nextTitle}</>}
            </p>
          </div>
          <div
            className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface ring-1 ring-border"
            role="progressbar"
            aria-label="Progress to next level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(lvl.progress * 100)}
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${lvl.progress * 100}%` }} />
          </div>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="rounded-lg border border-border px-3 py-1.5" title="Days in a row with practice">
            🔥 <strong>{streak}</strong> {streak === 1 ? "day" : "days"}
          </span>
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-1.5 transition hover:border-accent"
            aria-expanded={showBadges}
            onClick={() => setShowBadges(!showBadges)}
          >
            🏅 <strong>{earned.length}</strong>/{badges.length} badges
          </button>
          {compact && (
            <Link href="/tools/practice" className="rounded-lg bg-accent px-3 py-1.5 font-medium text-accent-contrast hover:opacity-90">
              Practise ▸
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
                  title={date ? `Earned on ${date}` : "Not earned yet"}
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {b.icon}
                  </span>
                  <span>
                    <span className="block font-medium">{b.title}</span>
                    <span className="block text-xs text-muted">{b.description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          {!compact && progress.xp > 0 && (
            <button
              type="button"
              className="self-start text-xs text-muted underline decoration-border underline-offset-2 hover:text-danger"
              onClick={() => window.confirm("Reset all XP, streaks and badges on this device?") && resetProgress()}
            >
              Reset progress
            </button>
          )}
        </div>
      )}
    </section>
  );
}
