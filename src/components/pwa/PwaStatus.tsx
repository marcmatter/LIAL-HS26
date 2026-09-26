"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useOnline } from "./useOnline";

type Toast = { kind: "ready" } | { kind: "updated" } | null;
type CheckState = "idle" | "checking" | "downloading" | "latest" | "failed";

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;
const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;

/**
 * Registers the service worker (production only) and keeps the app up to date:
 * it checks for a new version whenever the device comes back online, when the app
 * returns to the foreground, and every hour. A new version installs in the
 * background; the start page reloads itself, tool pages offer a reload button so
 * no input is lost.
 */
export default function PwaStatus() {
  const online = useOnline();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [check, setCheck] = useState<CheckState>("idle");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const sw = navigator.serviceWorker;
    const hadController = sw.controller !== null;
    let cancelled = false;

    sw.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        if (cancelled) return;
        registration.current = reg;
        setSupported(true);
      })
      .catch(() => {});

    function onControllerChange() {
      // First install: nothing to update. Otherwise a new version just took over.
      if (!hadController) return;
      if (pathRef.current === "/") window.location.reload();
      else setToast({ kind: "updated" });
    }
    function onMessage(event: MessageEvent) {
      if (event.data?.type === "activated" && !hadController) setToast({ kind: "ready" });
    }
    const update = () => registration.current?.update().catch(() => {});
    function onVisible() {
      if (document.visibilityState === "visible" && navigator.onLine) update();
    }

    sw.addEventListener("controllerchange", onControllerChange);
    sw.addEventListener("message", onMessage);
    sw.startMessages();
    window.addEventListener("online", update);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => navigator.onLine && update(), UPDATE_INTERVAL_MS);

    return () => {
      cancelled = true;
      sw.removeEventListener("controllerchange", onControllerChange);
      sw.removeEventListener("message", onMessage);
      window.removeEventListener("online", update);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (toast?.kind !== "ready") return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function checkForUpdates() {
    const reg = registration.current;
    if (!reg) return;
    setCheck("checking");
    try {
      await reg.update();
      setCheck(reg.installing || reg.waiting ? "downloading" : "latest");
    } catch {
      setCheck("failed");
    }
  }

  const checkLabel: Record<CheckState, string> = {
    idle: "Check for updates",
    checking: "Checking…",
    downloading: "Downloading new version…",
    latest: "✓ Up to date",
    failed: "Check failed — try again",
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Version <span className="font-mono">{version.split("-")[0]}</span>
          {buildTime && (
            <>
              {" "}
              · {new Date(buildTime).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Zurich" })}
            </>
          )}
        </span>
        {supported && (
          <>
            <span aria-hidden>·</span>
            <span>{online ? "Available offline" : "Offline — using saved version"}</span>
            {online && (
              <button
                type="button"
                className="underline decoration-border underline-offset-2 hover:text-foreground disabled:no-underline"
                onClick={checkForUpdates}
                disabled={check === "checking" || check === "downloading"}
              >
                {checkLabel[check]}
              </button>
            )}
          </>
        )}
      </div>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-lg"
        >
          <span className="flex-1">
            {toast.kind === "ready"
              ? "LIAL is saved on this device and now works offline."
              : "A new version with updated math helpers is ready."}
          </span>
          {toast.kind === "updated" && (
            <button
              type="button"
              className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-contrast hover:opacity-90"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          )}
          <button type="button" aria-label="Dismiss" className="px-1 text-muted hover:text-foreground" onClick={() => setToast(null)}>
            ✕
          </button>
        </div>
      )}
    </>
  );
}
