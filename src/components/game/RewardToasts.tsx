"use client";

import { useEffect, useState } from "react";
import { badgeById } from "@/lib/game/badges";
import { onReward, type Reward } from "@/lib/game/progress";
import { tr, useLang, useT } from "@/lib/i18n/lang";

type Item = Reward & { key: number };

/** Small pop-ups for XP, new badges and level-ups, shown on every page. */
export default function RewardToasts() {
  const [items, setItems] = useState<Item[]>([]);
  const lang = useLang();
  const t = useT();

  useEffect(() => {
    let next = 0;
    return onReward((reward) => {
      const key = ++next;
      setItems((list) => [...list.filter((i) => i.kind !== "xp" || reward.kind !== "xp"), { ...reward, key }].slice(-4));
      window.setTimeout(() => setItems((list) => list.filter((i) => i.key !== key)), reward.kind === "xp" ? 1800 : 4500);
    });
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 top-4 z-50 flex w-72 max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
      {items.map((item) => {
        if (item.kind === "xp") {
          return (
            <div key={item.key} className="animate-pop rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-contrast shadow-lg">
              +{item.amount} XP <span className="font-normal opacity-80">· {tr(lang, item.reason)}</span>
            </div>
          );
        }
        if (item.kind === "badge") {
          const b = badgeById(item.id);
          if (!b) return null;
          return (
            <div key={item.key} className="animate-pop flex w-full items-center gap-3 rounded-xl border border-accent/40 bg-background p-3 shadow-lg">
              <span className="text-3xl" aria-hidden>
                {b.icon}
              </span>
              <span className="text-sm">
                <span className="block text-xs font-medium uppercase tracking-wide text-accent">{t("Badge unlocked", "Abzeichen erhalten")}</span>
                <span className="block font-semibold">{tr(lang, b.title)}</span>
                <span className="block text-xs text-muted">{tr(lang, b.description)}</span>
              </span>
            </div>
          );
        }
        return (
          <div key={item.key} className="animate-pop w-full rounded-xl bg-accent p-3 text-accent-contrast shadow-lg">
            <span className="block text-xs font-medium uppercase tracking-wide opacity-80">{t("Level up!", "Level aufgestiegen!")} 🎉</span>
            <span className="block font-semibold">
              Level {item.level} · {tr(lang, item.title)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
