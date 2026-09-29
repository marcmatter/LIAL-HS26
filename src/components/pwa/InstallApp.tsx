"use client";

import Image from "next/image";
import { useState } from "react";
import { promptInstall, useInstallState } from "./installPrompt";
import { useT } from "@/lib/i18n/lang";

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline h-4 w-4 align-[-2px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-label="Share">
      <path d="M12 15V3" />
      <path d="m8 7 4-4 4 4" />
      <path d="M8 11H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2" />
    </svg>
  );
}

/** "Install app" card for the start page. Hidden when already running as the installed app. */
export default function InstallApp() {
  const state = useInstallState();
  const [help, setHelp] = useState(false);
  const t = useT();

  if (state === "unknown" || state === "installed") return null;

  async function onInstall() {
    if (state === "promptable") await promptInstall();
    else setHelp((h) => !h);
  }

  return (
    <section
      aria-labelledby="install-title"
      className="flex flex-col gap-4 rounded-xl border border-accent/30 bg-accent/5 p-4 sm:flex-row sm:items-center"
    >
      <Image src="/icons/icon-192.png" alt="" width={48} height={48} unoptimized className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="flex-1">
        <h2 id="install-title" className="font-semibold">
          {t("Install LIAL as an app", "LIAL als App installieren")}
        </h2>
        <p className="text-sm text-muted">
          {t(
            "Opens in its own window, works without internet and updates itself with new math helpers.",
            "Öffnet sich im eigenen Fenster, funktioniert ohne Internet und aktualisiert sich mit neuen Mathe-Helfern.",
          )}
        </p>
        {help && (
          <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm">
            {state === "ios" ? (
              <ol className="list-decimal space-y-1 pl-5">
                <li>
                  {t(
                    <>
                      Tap <ShareIcon /> <strong>Share</strong> in Safari&apos;s toolbar.
                    </>,
                    <>
                      Tippe in der Safari-Leiste auf <ShareIcon /> <strong>Teilen</strong>.
                    </>,
                  )}
                </li>
                <li>
                  {t(
                    <>
                      Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
                    </>,
                    <>
                      Wähle <strong>Zum Home-Bildschirm</strong>, dann <strong>Hinzufügen</strong>.
                    </>,
                  )}
                </li>
              </ol>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  {t(
                    <>
                      <strong>Chrome / Edge:</strong> click the install icon in the address bar, or open the menu (⋮) and choose{" "}
                      <strong>Install LIAL</strong> / <strong>Add to Home screen</strong>.
                    </>,
                    <>
                      <strong>Chrome / Edge:</strong> Klicke auf das Installieren-Symbol in der Adressleiste oder öffne das Menü (⋮)
                      und wähle <strong>LIAL installieren</strong> / <strong>Zum Startbildschirm hinzufügen</strong>.
                    </>,
                  )}
                </li>
                <li>
                  {t(
                    <>
                      <strong>Safari on Mac:</strong> File → <strong>Add to Dock</strong>.
                    </>,
                    <>
                      <strong>Safari auf dem Mac:</strong> Ablage → <strong>Zum Dock hinzufügen</strong>.
                    </>,
                  )}
                </li>
                <li>
                  {t(
                    <>
                      <strong>Firefox on Android:</strong> menu (⋮) → <strong>Install</strong>. Firefox on desktop cannot install
                      apps — the website still works offline once visited.
                    </>,
                    <>
                      <strong>Firefox auf Android:</strong> Menü (⋮) → <strong>Installieren</strong>. Firefox auf dem Desktop kann
                      keine Apps installieren — die Website funktioniert nach dem ersten Besuch trotzdem offline.
                    </>,
                  )}
                </li>
              </ul>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onInstall}
        aria-expanded={state === "promptable" ? undefined : help}
        className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition hover:opacity-90 sm:self-center"
      >
        <DownloadIcon />
        {state === "promptable" ? t("Install app", "App installieren") : help ? t("Hide instructions", "Anleitung ausblenden") : t("Install app", "App installieren")}
      </button>
    </section>
  );
}
