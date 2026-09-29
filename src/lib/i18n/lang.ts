"use client";

import { useSyncExternalStore } from "react";
import type { Lang } from "./text";

export { L, tr, type L10n, type Lang } from "./text";

/**
 * UI language (English / German). The choice is stored in localStorage; without a
 * stored choice the browser language decides. All open tabs switch together.
 */

const KEY = "lial-lang";
let current: Lang | null = null;
const listeners = new Set<() => void>();

function detect(): Lang {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored === "en" || stored === "de") return stored;
  } catch {
    // Storage blocked: fall back to the browser language.
  }
  return navigator.language?.toLowerCase().startsWith("de") ? "de" : "en";
}

function read(): Lang {
  if (!current) current = detect();
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    current = null;
    listeners.forEach((l) => l());
  });
}

export function setLang(lang: Lang) {
  current = lang;
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    // Not persisted (private mode); the choice still applies to this page.
  }
  document.documentElement.lang = lang;
  listeners.forEach((l) => l());
}

/** Current language; English during server rendering, the stored choice after hydration. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, read, () => "en");
}


/** `const t = useT(); t("Next step", "Nächster Schritt")` — works for strings and JSX. */
export function useT() {
  const lang = useLang();
  return <T,>(en: T, de: T): T => (lang === "de" ? de : en);
}
