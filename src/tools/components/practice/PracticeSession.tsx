"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Fraction } from "@/lib/linalg/fraction";
import { difficultyFor, generateExercise, pointsFor, topics, type Exercise } from "@/lib/game/exercises";
import { masteryStars, recordAnswer, recordSprint, useProgress, type Topic } from "@/lib/game/progress";
import { MatrixView, Paren, fmt } from "@/tools/components/operations/ui";
import { L, tr, useLang, useT, type L10n } from "@/lib/i18n/lang";

const SPRINT_SECONDS = 60;

const in3d = L("See it in 3D", "In 3D ansehen");
const special = L("Special matrices", "Spezielle Matrizen");
const exploreLinks: Partial<Record<Topic, { href: string; label: L10n }>> = {
  "vec-add": { href: "/tools/operations", label: in3d },
  "vec-comb": { href: "/tools/operations", label: in3d },
  dot: { href: "/tools/operations", label: in3d },
  "mat-add": { href: "/tools/operations", label: in3d },
  "mat-vec": { href: "/tools/operations", label: in3d },
  det: { href: "/tools/determinant", label: L("Determinant tool", "Determinanten-Werkzeug") },
  system: { href: "/tools/gaussian-elimination", label: L("Gauss-Jordan tool", "Gauss-Jordan-Werkzeug") },
  "mat-mul": { href: "/tools/operations", label: L("Matrix × matrix tool", "Matrix × Matrix") },
  transpose: { href: "/tools/operations", label: special },
  inverse: { href: "/tools/operations", label: special },
  lu: { href: "/tools/lu-decomposition", label: L("LU decomposition tool", "LR-Zerlegung") },
};

type Phase = "answering" | "correct" | "revealed";

const emptyInputs = (ex: Exercise) => ex.answer.map((row) => row.map(() => ""));

function parseAnswer(value: string): number | null {
  if (value.trim() === "") return null;
  return Fraction.parse(value)?.toNumber() ?? null;
}

const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

export default function PracticeSession({ topic, sprint, onExit }: { topic: Topic; sprint: boolean; onExit: () => void }) {
  const progress = useProgress();
  const lang = useLang();
  const t = useT();
  const stats = progress.topics[topic];
  const info = topics.find((t) => t.id === topic)!;

  const newExercise = () => generateExercise(topic, difficultyFor(progress.topics[topic]?.correct ?? 0));
  const [exercise, setExercise] = useState<Exercise>(newExercise);
  const [inputs, setInputs] = useState<string[][]>(() => emptyInputs(exercise));
  const [phase, setPhase] = useState<Phase>("answering");
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState(false);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<L10n | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [round, setRound] = useState(0);

  // Sprint state
  const [deadline, setDeadline] = useState(() => Date.now() + SPRINT_SECONDS * 1000);
  const [now, setNow] = useState(() => Date.now());
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);
  const timeLeft = Math.max(0, Math.ceil((deadline - now) / 1000));

  useEffect(() => {
    if (!sprint || finished) return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= deadline) {
        window.clearInterval(timer);
        setFinished(true);
        recordSprint(topic, scoreRef.current);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [sprint, finished, deadline, topic]);

  function next() {
    const ex = newExercise();
    setExercise(ex);
    setInputs(emptyInputs(ex));
    setPhase("answering");
    setTries(0);
    setHint(false);
    setWrong(new Set());
    setMessage(null);
    setRound((r) => r + 1);
  }

  function check() {
    if (phase !== "answering" || finished) return;
    const values = inputs.map((row) => row.map(parseAnswer));
    if (values.some((row) => row.some((v) => v === null))) {
      setMessage(L("Enter a number in every field (fractions like 3/4 are fine).", "Gib in jedes Feld eine Zahl ein (Brüche wie 3/4 sind erlaubt)."));
      return;
    }
    const bad = new Set<string>();
    exercise.answer.forEach((row, i) => row.forEach((x, j) => !close(values[i][j]!, x) && bad.add(`${i}-${j}`)));
    setWrong(bad);

    if (bad.size === 0) {
      const points = sprint ? 5 : pointsFor(exercise.difficulty, stats?.streak ?? 0, hint || tries > 0);
      recordAnswer(topic, true, points, tries === 0);
      setPhase("correct");
      setMessage(null);
      if (sprint) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        window.setTimeout(next, 450);
      }
      return;
    }

    setShakeKey((k) => k + 1);
    if (tries === 0) recordAnswer(topic, false, 0, false);
    if (sprint || tries >= 1) {
      setPhase("revealed");
      setMessage(null);
      if (sprint) window.setTimeout(next, 1500);
    } else {
      setTries(1);
      setMessage(
        bad.size === 1 && exercise.answer.flat().length > 1
          ? L("Almost! One entry is wrong — it is highlighted. Try again.", "Fast! Ein Eintrag ist falsch — er ist markiert. Versuch es nochmal.")
          : L("Not quite. The wrong entries are highlighted — try again, or use a hint.", "Noch nicht ganz. Die falschen Einträge sind markiert — versuch es nochmal oder nimm einen Tipp."),
      );
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (phase === "answering") check();
    else if (!sprint) next();
  }

  const stars = masteryStars(stats);
  const scalar = exercise.answer.length === 1 && exercise.answer[0].length === 1;

  if (sprint && finished) {
    const best = Math.max(stats?.sprintBest ?? 0, score);
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
        <p className="text-5xl" aria-hidden>
          {score >= 8 ? "🏆" : score >= 4 ? "🎉" : "⏱️"}
        </p>
        <h2 className="text-2xl font-bold">
          {t(`${score} correct in ${SPRINT_SECONDS} seconds`, `${score} richtig in ${SPRINT_SECONDS} Sekunden`)}
        </h2>
        <p className="text-muted">
          {score >= best && score > 0 ? t("New personal best!", "Neuer persönlicher Rekord!") : t(`Your best: ${best}`, `Dein Rekord: ${best}`)} · +{score * 5} XP
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-contrast hover:opacity-90"
            onClick={() => {
              scoreRef.current = 0;
              setScore(0);
              setDeadline(Date.now() + SPRINT_SECONDS * 1000);
              setNow(Date.now());
              setFinished(false);
              next();
            }}
          >
            {t("Play again", "Nochmal spielen")}
          </button>
          <button type="button" className="rounded-lg border border-border px-4 py-2 hover:border-accent" onClick={onExit}>
            {t("All topics", "Alle Themen")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" onKeyDown={onKeyDown}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="text-sm text-muted hover:text-foreground" onClick={onExit}>
          ← {t("All topics", "Alle Themen")}
        </button>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg border border-border px-3 py-1">
            {info.icon} {tr(lang, info.title)}
          </span>
          <span className="rounded-lg border border-border px-3 py-1" title={t("Difficulty grows as you master the topic", "Die Schwierigkeit steigt mit deiner Meisterschaft")}>
            Level {exercise.difficulty}/3
          </span>
          <span className="rounded-lg border border-border px-3 py-1" title={t("Mastery", "Meisterschaft")}>
            <span className="text-accent">{"★".repeat(stars)}</span>
            <span className="text-muted">{"☆".repeat(3 - stars)}</span>
          </span>
          {sprint ? (
            <>
              <span className={`rounded-lg px-3 py-1 font-mono font-semibold ${timeLeft <= 10 ? "bg-danger/10 text-danger" : "bg-accent/10"}`}>
                ⏱ {timeLeft}s
              </span>
              <span className="rounded-lg bg-accent/10 px-3 py-1 font-semibold">✓ {score}</span>
            </>
          ) : (
            <span className="rounded-lg border border-border px-3 py-1" title={t("Correct first-try answers in a row", "Richtige Antworten im ersten Versuch in Folge")}>
              🔥 {stats?.streak ?? 0}
            </span>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-5 rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold">{tr(lang, exercise.task)}</h2>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {exercise.given.map((g) => (
            <div key={g.label} className="inline-flex items-center gap-2">
              <span
                className="font-serif text-lg font-semibold italic"
                style={{ color: g.color === "a" ? "var(--vec-a)" : g.color === "b" ? "var(--vec-b)" : undefined }}
              >
                {g.label}
              </span>
              <span className="text-muted">=</span>
              {typeof g.value === "number" ? <span className="font-mono">{fmt(g.value)}</span> : <MatrixView cells={g.value} />}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <span className="font-serif text-lg italic">{exercise.answerLabel}</span>
          <span className="text-muted">=</span>
          <AnswerGrid
            key={`${round}-${shakeKey}`}
            inputs={inputs}
            onChange={setInputs}
            wrong={wrong}
            phase={phase}
            scalar={scalar}
            shake={shakeKey > 0 && phase !== "correct"}
          />
        </div>

        {message && <p className="text-sm text-danger">{tr(lang, message)}</p>}
        {hint && phase === "answering" && (
          <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm">💡 {tr(lang, exercise.hint)}</p>
        )}

        {phase === "correct" && !sprint && (
          <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 font-medium text-success">
            ✓ {t("Correct!", "Richtig!")}{" "}
            {tries === 0 && !hint
              ? t("First try — streak +1.", "Im ersten Versuch — Serie +1.")
              : tries > 0
                ? t("Got it on the second try.", "Im zweiten Versuch geschafft.")
                : t("Well done.", "Gut gemacht.")}
          </p>
        )}
        {phase === "revealed" && (
          <div className="flex flex-col gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-3 text-sm">
            <p className="font-medium text-danger">{t("Here is the solution:", "So geht die Lösung:")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-serif italic">{exercise.answerLabel}</span>
              <span className="text-muted">=</span>
              {scalar ? <span className="font-mono">{fmt(exercise.answer[0][0])}</span> : <MatrixView cells={exercise.answer} />}
            </div>
            <ul className="flex flex-col gap-1 font-mono text-xs text-muted">
              {exercise.solution.map((line, i) => (
                <li key={i}>{tr(lang, line)}</li>
              ))}
            </ul>
          </div>
        )}

        {!sprint && (
          <div className="flex flex-wrap items-center gap-2">
            {phase === "answering" ? (
              <>
                <button type="button" className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-contrast hover:opacity-90" onClick={check}>
                  {t("Check", "Prüfen")} <kbd className="ml-1 hidden text-xs opacity-70 sm:inline">↵</kbd>
                </button>
                {!hint && (
                  <button type="button" className="rounded-lg border border-border px-4 py-2 hover:border-accent" onClick={() => setHint(true)}>
                    💡 {t("Hint", "Tipp")} <span className="text-xs text-muted">(½ XP)</span>
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground"
                  onClick={() => {
                    if (tries === 0) recordAnswer(topic, false, 0, false);
                    setPhase("revealed");
                  }}
                >
                  {t("Show solution", "Lösung zeigen")}
                </button>
              </>
            ) : (
              <button type="button" autoFocus className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-contrast hover:opacity-90" onClick={next}>
                {t("Next exercise", "Nächste Aufgabe")} ▸
              </button>
            )}
            {exploreLinks[topic] && (
              <Link href={exploreLinks[topic]!.href} className="ml-auto text-sm text-muted underline decoration-border underline-offset-2 hover:text-foreground">
                {tr(lang, exploreLinks[topic]!.label)} →
              </Link>
            )}
          </div>
        )}
        {sprint && phase === "answering" && (
          <button type="button" className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-accent-contrast hover:opacity-90" onClick={check}>
            {t("Check", "Prüfen")} <kbd className="ml-1 text-xs opacity-70">↵</kbd>
          </button>
        )}
      </section>
    </div>
  );
}

function AnswerGrid({
  inputs,
  onChange,
  wrong,
  phase,
  scalar,
  shake,
}: {
  inputs: string[][];
  onChange: (v: string[][]) => void;
  wrong: Set<string>;
  phase: Phase;
  scalar: boolean;
  shake: boolean;
}) {
  const t = useT();
  const cols = inputs[0]?.length ?? 1;
  const cell = (r: number, c: number) => {
    const isWrong = wrong.has(`${r}-${c}`);
    const state = phase === "correct" ? "border-success bg-success/10" : isWrong ? "border-danger bg-danger/10" : "border-border bg-background";
    return (
      <input
        key={`${r}-${c}`}
        autoFocus={r === 0 && c === 0}
        inputMode="decimal"
        autoComplete="off"
        aria-label={scalar ? t("Your answer", "Deine Antwort") : t(`Answer row ${r + 1}, column ${c + 1}`, `Antwort Zeile ${r + 1}, Spalte ${c + 1}`)}
        aria-invalid={isWrong}
        readOnly={phase !== "answering"}
        className={`h-10 ${scalar ? "w-28" : "w-16"} rounded-md border px-1 text-center font-mono focus:outline-none focus:ring-2 focus:ring-accent ${state}`}
        value={inputs[r][c]}
        onChange={(e) => onChange(inputs.map((row, i) => row.map((x, j) => (i === r && j === c ? e.target.value : x))))}
      />
    );
  };
  if (scalar) return <span className={shake ? "animate-shake" : ""}>{cell(0, 0)}</span>;
  return (
    <span className={shake ? "animate-shake" : ""}>
      <Paren>
        <span className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}>
          {inputs.map((row, r) => row.map((_, c) => cell(r, c)))}
        </span>
      </Paren>
    </span>
  );
}
