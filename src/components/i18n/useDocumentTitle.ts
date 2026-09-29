"use client";

import { useEffect } from "react";

/**
 * Keeps document.title in the current UI language. Next.js writes the <title> from
 * the (English) page metadata, possibly after hydration, so changes are watched and
 * the localized title is re-applied.
 */
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (!title) return;
    const apply = () => {
      if (document.title !== title) document.title = title;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [title]);
}
