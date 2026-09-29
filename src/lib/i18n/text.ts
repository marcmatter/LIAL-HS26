/**
 * Language-independent helpers for bilingual texts. Kept free of React so they can
 * also run on the server (tool registry, metadata); the hooks live in ./lang.
 */
export type Lang = "en" | "de";

/** A text in both languages, for data that lives outside components (registry, exercises, badges…). */
export type L10n = { en: string; de: string };

/** Builds an L10n value. */
export const L = (en: string, de: string): L10n => ({ en, de });

/** Picks the text for a language. */
export const tr = (lang: Lang, text: L10n | string) => (typeof text === "string" ? text : text[lang]);
