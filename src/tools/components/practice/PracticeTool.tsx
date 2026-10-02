"use client";

import { useState } from "react";
import PlayerCard from "@/components/game/PlayerCard";
import { topics } from "@/lib/game/exercises";
import { masteryStars, useProgress, type Topic } from "@/lib/game/progress";
import PracticeSession from "./PracticeSession";
import { tr, useLang, useT } from "@/lib/i18n/lang";

type View = { topic: Topic; sprint: boolean } | null;

export default function PracticeTool() {
  const progress = useProgress();
  const lang = useLang();
  const t = useT();
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
          <h2 className="text-lg font-semibold">{t("Choose a topic", "Wähle ein Thema")}</h2>
          <p className="text-sm text-muted">
            {t("Correct answers earn XP. Exercises get harder as you master a topic.", "Richtige Antworten bringen XP. Die Aufgaben werden schwerer, je besser du ein Thema beherrschst.")}
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => {
            const stats = progress.topics[topic.id];
            const stars = masteryStars(stats);
            return (
              <li key={topic.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      <span aria-hidden>{topic.icon}</span> {tr(lang, topic.title)}
                    </p>
                    <p className="text-sm text-muted">{tr(lang, topic.description)}</p>
                  </div>
                  <span className="shrink-0 text-lg tracking-tight" aria-label={t(`${stars} of 3 mastery stars`, `${stars} von 3 Meisterschaftssternen`)}>
                    <span className="text-accent">{"★".repeat(stars)}</span>
                    <span className="text-muted/50">{"☆".repeat(3 - stars)}</span>
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {stats
                    ? t(
                        `${stats.correct} solved · best streak ${stats.bestStreak} · sprint best ${stats.sprintBest}`,
                        `${stats.correct} gelöst · beste Serie ${stats.bestStreak} · Sprint-Rekord ${stats.sprintBest}`,
                      )
                    : t("Not started yet", "Noch nicht begonnen")}
                </p>
                <div className="mt-auto flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast hover:opacity-90"
                    onClick={() => setView({ topic: topic.id, sprint: false })}
                  >
                    {t("Practise", "Üben")}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:border-accent"
                    title={t("As many correct answers as possible in 60 seconds", "So viele richtige Antworten wie möglich in 60 Sekunden")}
                    onClick={() => setView({ topic: topic.id, sprint: true })}
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
