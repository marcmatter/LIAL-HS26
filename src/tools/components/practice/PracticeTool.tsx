"use client";

import { useState } from "react";
import PlayerCard from "@/components/game/PlayerCard";
import { topics } from "@/lib/game/exercises";
import { masteryStars, useProgress, type Topic } from "@/lib/game/progress";
import PracticeSession from "./PracticeSession";

type View = { topic: Topic; sprint: boolean } | null;

export default function PracticeTool() {
  const progress = useProgress();
  const [view, setView] = useState<View>(null);

  if (view) {
    return (
      <div className="flex flex-col gap-6">
        <PracticeSession key={`${view.topic}-${view.sprint}`} topic={view.topic} sprint={view.sprint} onExit={() => setView(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PlayerCard />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Choose a topic</h2>
          <p className="text-sm text-muted">Correct answers earn XP. Exercises get harder as you master a topic.</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => {
            const stats = progress.topics[t.id];
            const stars = masteryStars(stats);
            return (
              <li key={t.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      <span aria-hidden>{t.icon}</span> {t.title}
                    </p>
                    <p className="text-sm text-muted">{t.description}</p>
                  </div>
                  <span className="shrink-0 text-lg tracking-tight" aria-label={`${stars} of 3 mastery stars`}>
                    <span className="text-accent">{"★".repeat(stars)}</span>
                    <span className="text-muted/50">{"☆".repeat(3 - stars)}</span>
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {stats ? `${stats.correct} solved · best streak ${stats.bestStreak} · sprint best ${stats.sprintBest}` : "Not started yet"}
                </p>
                <div className="mt-auto flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast hover:opacity-90"
                    onClick={() => setView({ topic: t.id, sprint: false })}
                  >
                    Practise
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:border-accent"
                    title="As many correct answers as possible in 60 seconds"
                    onClick={() => setView({ topic: t.id, sprint: true })}
                  >
                    ⏱ Sprint
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
