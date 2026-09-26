"use client";

import { useSyncExternalStore } from "react";

/** Chromium's install prompt event (not yet in the DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState =
  | "unknown" // server render / before hydration
  | "installed" // running as the installed app, or just installed
  | "promptable" // the browser offered an install prompt we can trigger
  | "ios" // iPhone/iPad Safari: install via Share → Add to Home Screen
  | "manual"; // other browsers: install via the browser menu, if supported

let deferred: BeforeInstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// Registered at module load (this module is imported from the root layout), so the
// event is not missed when the browser fires it before React has hydrated.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    justInstalled = true;
    notify();
  });
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function getState(): InstallState {
  if (justInstalled || isStandalone()) return "installed";
  if (deferred) return "promptable";
  return isIos() ? "ios" : "manual";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, getState, () => "unknown");
}

/** Shows the browser's install dialog. Resolves to true if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") justInstalled = true;
  notify();
  return outcome === "accepted";
}
