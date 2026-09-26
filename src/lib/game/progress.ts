"use client";

import { useSyncExternalStore } from "react";
import { badgeById } from "./badges";

/**
 * Learning progress (XP, levels, streaks, mastery, badges), stored in this
 * browser's localStorage. No account needed and it works offline; progress is
 * per device.
 */

export type Topic = "vec-add" | "vec-comb" | "dot" | "length" | "mat-add" | "mat-vec" | "det" | "system";

export interface TopicStats {
  attempts: number;
  correct: number;
  /** Current run of first-try correct answers. */
  streak: number;
  bestStreak: number;
  sprintBest: number;
}

export interface Progress {
  xp: number;
  /** Local dates (YYYY-MM-DD) with at least one correct answer or solved challenge. */
  days: string[];
  topics: Partial<Record<Topic, TopicStats>>;
  /** Badge id → date earned. */
  badges: Record<string, string>;
  /** Gauss challenge key → best stars (1–3). */
  challenges: Record<string, number>;
}

export type Reward =
  | { kind: "xp"; amount: number; reason: string }
  | { kind: "badge"; id: string }
  | { kind: "level"; level: number; title: string };

const KEY = "lial-progress-v1";
const EMPTY: Progress = { xp: 0, days: [], topics: {}, badges: {}, challenges: {} };
export const ALL_TOPICS: Topic[] = ["vec-add", "vec-comb", "dot", "length", "mat-add", "mat-vec", "det", "system"];

// ---- levels ------------------------------------------------------------------

const LEVELS = [
  { xp: 0, title: "Scalar" },
  { xp: 100, title: "Vector" },
  { xp: 250, title: "Linear Combination" },
  { xp: 500, title: "Matrix" },
  { xp: 900, title: "Basis" },
  { xp: 1400, title: "Determinant" },
  { xp: 2000, title: "Eigenvector" },
  { xp: 2800, title: "Vector-Space Master" },
];

export function levelInfo(xp: number) {
  let index = 0;
  while (index + 1 < LEVELS.length && xp >= LEVELS[index + 1].xp) index++;
  const current = LEVELS[index];
  const next = LEVELS[index + 1];
  return {
    level: index + 1,
    title: current.title,
    /** 0…1 progress to the next level (1 at max level). */
    progress: next ? (xp - current.xp) / (next.xp - current.xp) : 1,
    toNext: next ? next.xp - xp : 0,
    nextTitle: next?.title ?? null,
  };
}

/** Mastery stars (0–3) for a topic from its number of correct answers. */
export function masteryStars(stats?: TopicStats): number {
  const c = stats?.correct ?? 0;
  return c >= 15 ? 3 : c >= 8 ? 2 : c >= 3 ? 1 : 0;
}

// ---- dates & streaks -----------------------------------------------------------

function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Consecutive active days ending today (or yesterday, so the streak survives until you practise today). */
export function dayStreak(days: string[]): number {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(localDate(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(localDate(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// ---- store -----------------------------------------------------------------------

let cache: Progress | null = null;
const listeners = new Set<() => void>();
const rewardListeners = new Set<(r: Reward) => void>();

function read(): Progress {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Progress>) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: Progress, rewards: Reward[] = []) {
  const before = levelInfo(read().xp).level;
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked (private mode): progress lives for this session only.
  }
  listeners.forEach((l) => l());
  const after = levelInfo(next.xp).level;
  if (after > before) rewards.push({ kind: "level", level: after, title: levelInfo(next.xp).title });
  rewards.forEach((r) => rewardListeners.forEach((l) => l(r)));
}

if (typeof window !== "undefined") {
  // Keep several open tabs in sync.
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    cache = null;
    listeners.forEach((l) => l());
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Listen for XP, badges and level-ups (used by the reward toasts). */
export function onReward(listener: (r: Reward) => void) {
  rewardListeners.add(listener);
  return () => {
    rewardListeners.delete(listener);
  };
}

// ---- mutations ---------------------------------------------------------------------

function withBadge(p: Progress, id: string, rewards: Reward[]): Progress {
  if (p.badges[id] || !badgeById(id)) return p;
  rewards.push({ kind: "badge", id });
  return { ...p, xp: p.xp + 25, badges: { ...p.badges, [id]: localDate() } };
}

function withToday(p: Progress, rewards: Reward[]): Progress {
  const today = localDate();
  if (p.days.includes(today)) return p;
  const next = { ...p, days: [...p.days, today].slice(-60) };
  return dayStreak(next.days) >= 3 ? withBadge(next, "habit", rewards) : next;
}

export function awardBadge(id: string) {
  const rewards: Reward[] = [];
  const p = read();
  const next = withBadge(p, id, rewards);
  if (next !== p) write(next, rewards);
}

/**
 * Records a practice answer. `points` is added when correct; `firstTry` keeps the
 * topic streak going (a correct answer after a wrong one does not).
 */
export function recordAnswer(topic: Topic, correct: boolean, points: number, firstTry: boolean) {
  const rewards: Reward[] = [];
  let p = read();
  const s: TopicStats = p.topics[topic] ?? { attempts: 0, correct: 0, streak: 0, bestStreak: 0, sprintBest: 0 };
  const streak = correct && firstTry ? s.streak + 1 : correct ? s.streak : 0;
  const stats: TopicStats = {
    attempts: s.attempts + 1,
    correct: s.correct + (correct ? 1 : 0),
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    sprintBest: s.sprintBest,
  };
  p = { ...p, topics: { ...p.topics, [topic]: stats } };
  if (correct) {
    p = { ...p, xp: p.xp + points };
    rewards.push({ kind: "xp", amount: points, reason: "Correct!" });
    p = withToday(p, rewards);
    p = withBadge(p, "first-steps", rewards);
    if (streak >= 5) p = withBadge(p, "on-a-roll", rewards);
    if (streak >= 10) p = withBadge(p, "unstoppable", rewards);
    if (masteryStars(stats) === 3) p = withBadge(p, "master", rewards);
    if (ALL_TOPICS.every((t) => (p.topics[t]?.correct ?? 0) > 0)) p = withBadge(p, "all-rounder", rewards);
  }
  write(p, rewards);
}

export function recordSprint(topic: Topic, score: number) {
  const rewards: Reward[] = [];
  let p = read();
  const s = p.topics[topic];
  if (s && score > s.sprintBest) p = { ...p, topics: { ...p.topics, [topic]: { ...s, sprintBest: score } } };
  if (score >= 8) p = withBadge(p, "sprinter", rewards);
  write(p, rewards);
}

/** Stars for a Gauss-Jordan challenge: within par ★★★, up to 2 extra steps ★★, otherwise ★. */
export function challengeStars(steps: number, par: number): number {
  return steps <= par ? 3 : steps <= par + 2 ? 2 : 1;
}

/** Records a solved Gauss-Jordan challenge; XP only for improving on your best. */
export function recordChallenge(key: string, steps: number, par: number): number {
  const rewards: Reward[] = [];
  let p = read();
  const stars = challengeStars(steps, par);
  const previous = p.challenges[key] ?? 0;
  p = withBadge(p, "echelon", rewards);
  if (stars === 3) p = withBadge(p, "under-par", rewards);
  if (stars > previous) {
    const xp = (stars - previous) * 20;
    p = { ...p, xp: p.xp + xp, challenges: { ...p.challenges, [key]: stars } };
    rewards.push({ kind: "xp", amount: xp, reason: `${"★".repeat(stars)} challenge solved` });
    p = withToday(p, rewards);
  }
  write(p, rewards);
  return stars;
}

export function resetProgress() {
  write(EMPTY);
}
