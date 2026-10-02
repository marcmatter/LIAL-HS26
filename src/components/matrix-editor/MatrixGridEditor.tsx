"use client";

import { useRef, useState, useSyncExternalStore, type ClipboardEvent, type KeyboardEvent } from "react";
import { Fraction } from "@/lib/linalg/fraction";
import { tokenizeMatrix, type FracMatrix } from "@/lib/linalg/rowOps";
import { useT } from "@/lib/i18n/lang";

const MAX_ROWS = 8;
const MAX_COLS = 9;
const SIZES: [number, number][] = [
  [2, 2],
  [2, 3],
  [3, 3],
  [3, 4],
  [4, 4],
  [4, 5],
];

const sub = (n: number) => String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);

/** Where the right-hand side starts: [A | I] when cols = 2·rows, otherwise the last column. */
export function augmentedDivider(rows: number, cols: number): number {
  return rows > 1 && cols === 2 * rows ? rows : cols - 1;
}

function resize(cells: string[][], rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => cells[r]?.[c] ?? ""));
}

const parseCell = (s: string) => (s.trim() === "" ? Fraction.ZERO : Fraction.parse(s));

// Touch devices get a built-in number pad: phone keyboards often lack "−" and "/".
const coarseQuery = "(pointer: coarse)";
function subscribeCoarse(cb: () => void) {
  const mq = window.matchMedia(coarseQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const useCoarsePointer = () =>
  useSyncExternalStore(subscribeCoarse, () => window.matchMedia(coarseQuery).matches, () => false);

interface MatrixGridEditorProps {
  initial: string[][];
  initialAugmented: boolean;
  /** Current state of the workspace, offered as "Use current state". */
  current?: string[][];
  submitLabel?: string;
  onSubmit: (matrix: FracMatrix, augmented: boolean) => void;
  onCancel?: () => void;
}

/**
 * Spreadsheet-like matrix entry: a grid of cells with size controls, arrow-key
 * navigation, paste of whole matrices (spreadsheet, text or NumPy) into any cell,
 * quick fills and — on touch screens — a number pad with "−" and "/".
 */
export default function MatrixGridEditor({
  initial,
  initialAugmented,
  current,
  submitLabel,
  onSubmit,
  onCancel,
}: MatrixGridEditorProps) {
  const [cells, setCells] = useState(initial);
  const [augmented, setAugmented] = useState(initialAugmented);
  const [focus, setFocus] = useState<{ r: number; c: number } | null>(null);
  const [nativeKeyboard, setNativeKeyboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();
  const refs = useRef(new Map<string, HTMLInputElement>());
  // A freshly focused cell looks fully selected, so the first keypad key replaces its value.
  const fresh = useRef(false);
  const coarse = useCoarsePointer();
  const keypad = coarse && !nativeKeyboard;

  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  const divider = augmented && cols > 1 ? augmentedDivider(rows, cols) : null;
  const invalid = cells.map((row) => row.map((v) => parseCell(v) === null));
  const invalidCount = invalid.flat().filter(Boolean).length;

  function focusCell(r: number, c: number) {
    const rr = Math.max(0, Math.min(rows - 1, r));
    const cc = Math.max(0, Math.min(cols - 1, c));
    requestAnimationFrame(() => {
      const el = refs.current.get(`${rr}-${cc}`);
      el?.focus();
      el?.select();
    });
  }

  function setCell(r: number, c: number, value: string) {
    setCells((cs) => cs.map((row, i) => (i === r ? row.map((x, j) => (j === c ? value : x)) : row)));
    setError(null);
  }

  function setSize(r: number, c: number) {
    setCells((cs) => resize(cs, Math.max(1, Math.min(MAX_ROWS, r)), Math.max(1, Math.min(MAX_COLS, c))));
    setError(null);
  }

  function nextCell(r: number, c: number) {
    if (c + 1 < cols) focusCell(r, c + 1);
    else if (r + 1 < rows) focusCell(r + 1, 0);
    else {
      setFocus(null);
      (document.activeElement as HTMLElement | null)?.blur();
    }
  }

  function submit() {
    const parsed = cells.map((row) => row.map(parseCell));
    if (parsed.some((row) => row.some((x) => x === null))) {
      setError(
        t(
          `${invalidCount} ${invalidCount === 1 ? "entry is" : "entries are"} not a number — see the red cells.`,
          `${invalidCount} ${invalidCount === 1 ? "Eintrag ist" : "Einträge sind"} keine Zahl — siehe die roten Felder.`,
        ),
      );
      return;
    }
    onSubmit(parsed as FracMatrix, augmented && cols > 1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>, r: number, c: number) {
    const el = e.currentTarget;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const atEnd = el.selectionStart === el.value.length;
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) submit();
      else nextCell(r, c);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(r - 1, c);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(r + 1, c);
    } else if (e.key === "ArrowLeft" && atStart) {
      e.preventDefault();
      focusCell(r, c - 1);
    } else if (e.key === "ArrowRight" && atEnd) {
      e.preventDefault();
      focusCell(r, c + 1);
    }
  }

  /** Pasting several values into one cell fills the grid from there on (and grows it if needed). */
  function onPaste(e: ClipboardEvent<HTMLInputElement>, r: number, c: number) {
    const tokens = tokenizeMatrix(e.clipboardData.getData("text"));
    if (tokens.length === 0 || (tokens.length === 1 && tokens[0].length === 1)) return;
    e.preventDefault();
    const needRows = Math.min(MAX_ROWS, Math.max(rows, r + tokens.length));
    const needCols = Math.min(MAX_COLS, Math.max(cols, c + Math.max(...tokens.map((t) => t.length))));
    setCells((cs) => {
      const next = resize(cs, needRows, needCols);
      tokens.forEach((row, i) => row.forEach((v, j) => r + i < needRows && c + j < needCols && (next[r + i][c + j] = v)));
      return next;
    });
    setError(null);
  }

  function fill(kind: "clear" | "identity" | "random" | "current") {
    if (kind === "current" && current) {
      setCells(current);
    } else {
      setCells((cs) =>
        cs.map((row, i) =>
          row.map((_, j) => {
            if (kind === "clear") return "";
            if (kind === "identity") return i === j ? "1" : "0";
            return String(Math.floor(Math.random() * 13) - 6);
          }),
        ),
      );
    }
    setError(null);
  }

  // ---- number pad (touch) ----
  function press(key: string) {
    if (!focus) return;
    const { r, c } = focus;
    const replace = fresh.current;
    fresh.current = false;
    const v = cells[r][c];
    switch (key) {
      case "⌫":
        setCell(r, c, replace ? "" : v.slice(0, -1));
        break;
      case "±":
        setCell(r, c, v.startsWith("-") || v.startsWith("−") ? v.slice(1) : `-${v}`);
        break;
      case "←":
        focusCell(r, c - 1);
        return;
      case "→":
        focusCell(r, c + 1);
        return;
      case "next":
        nextCell(r, c);
        return;
      default:
        setCell(r, c, (replace || v === "0" ? "" : v) + key);
    }
    focusCell(r, c);
  }

  const small = "rounded-md border border-border bg-surface px-2.5 py-1 text-sm transition hover:border-accent disabled:opacity-40";

  return (
    <div className="flex flex-col gap-4">
      {/* Size & fill controls */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
        <Stepper
          label={t("Rows", "Zeilen")}
          less={t("Fewer rows", "Weniger Zeilen")}
          more={t("More rows", "Mehr Zeilen")}
          value={rows}
          min={1}
          max={MAX_ROWS}
          onChange={(r) => setSize(r, cols)}
        />
        <Stepper
          label={t("Columns", "Spalten")}
          less={t("Fewer columns", "Weniger Spalten")}
          more={t("More columns", "Mehr Spalten")}
          value={cols}
          min={1}
          max={MAX_COLS}
          onChange={(c) => setSize(rows, c)}
        />
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("Quick sizes", "Schnellgrössen")}>
          {SIZES.map(([r, c]) => (
            <button
              key={`${r}x${c}`}
              type="button"
              aria-pressed={rows === r && cols === c}
              className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                rows === r && cols === c ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted hover:border-accent"
              }`}
              onClick={() => setSize(r, c)}
            >
              {r}×{c}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={augmented} onChange={(e) => setAugmented(e.target.checked)} />
          <span>
            {t("Augmented", "Erweitert")} <span className="text-muted">(A | b)</span>
          </span>
        </label>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto pb-1">
        <div
          className="inline-grid gap-x-1.5 gap-y-1.5"
          style={{ gridTemplateColumns: `auto repeat(${cols}, 4.25rem)` }}
          role="grid"
          aria-label={t(`Matrix editor, ${rows} by ${cols}`, `Matrix-Editor, ${rows} mal ${cols}`)}
        >
          <span />
          {Array.from({ length: cols }, (_, c) => (
            <span
              key={c}
              className={`text-center font-serif text-sm italic text-muted ${divider !== null && c === divider ? "border-l-2 border-foreground/40" : ""}`}
            >
              {divider === null ? `${t("col", "Sp.")} ${c + 1}` : c < divider ? `x${sub(c + 1)}` : cols - divider === 1 ? "b" : `b${sub(c - divider + 1)}`}
            </span>
          ))}
          {cells.map((row, r) => (
            <div key={r} role="row" className="contents">
              <span className="flex items-center pr-1 text-sm text-muted">R{r + 1}</span>
              {row.map((v, c) => {
                // Do not flag a cell while it is being typed in (e.g. just "−"), unless loading failed.
                const bad = invalid[r][c] && !(focus?.r === r && focus?.c === c && !error);
                return (
                <div key={c} role="gridcell" className={divider !== null && c === divider ? "border-l-2 border-foreground/40 pl-1.5" : ""}>
                  <input
                    ref={(el) => {
                      if (el) refs.current.set(`${r}-${c}`, el);
                      else refs.current.delete(`${r}-${c}`);
                    }}
                    value={v}
                    placeholder="0"
                    inputMode={keypad ? "none" : "text"}
                    enterKeyHint="next"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label={t(`Row ${r + 1}, column ${c + 1}`, `Zeile ${r + 1}, Spalte ${c + 1}`)}
                    aria-invalid={bad}
                    title={bad ? t("Not a number. Use e.g. 3, -2, 0.5 or 3/4.", "Keine Zahl. Verwende z. B. 3, -2, 0.5 oder 3/4.") : undefined}
                    className={`h-10 w-full rounded-md border px-1 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent ${
                      bad
                        ? "border-danger bg-danger/10"
                        : focus?.r === r && focus?.c === c
                          ? "border-accent bg-background"
                          : "border-border bg-background"
                    }`}
                    onChange={(e) => setCell(r, c, e.target.value)}
                    onFocus={(e) => {
                      fresh.current = true;
                      setFocus({ r, c });
                      e.target.select();
                    }}
                    onKeyDown={(e) => onKeyDown(e, r, c)}
                    onPaste={(e) => onPaste(e, r, c)}
                  />
                </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {keypad && focus && (
        <div className="grid max-w-sm grid-cols-5 gap-1.5 rounded-xl border border-border bg-surface p-2" role="group" aria-label={t("Number pad", "Ziffernblock")}>
          {["7", "8", "9", "⌫", "←", "4", "5", "6", "±", "→", "1", "2", "3", "/", ".", "0"].map((k) => (
            <button
              key={k}
              type="button"
              // Keep focus (and the caret) in the cell while tapping keys.
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => press(k)}
              aria-label={
                {
                  "⌫": t("Delete", "Löschen"),
                  "±": t("Change sign", "Vorzeichen wechseln"),
                  "←": t("Previous cell", "Vorheriges Feld"),
                  "→": t("Next cell", "Nächstes Feld"),
                  "/": t("Fraction bar", "Bruchstrich"),
                }[k] ?? k
              }
              className={`h-11 rounded-lg border border-border text-lg font-medium active:bg-accent/20 ${/\d/.test(k) ? "bg-background" : "bg-surface"}`}
            >
              {k === "±" ? "+/−" : k}
            </button>
          ))}
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => press("next")}
            className="col-span-3 h-11 rounded-lg bg-accent font-medium text-accent-contrast"
          >
            {t("Next", "Weiter")} ↵
          </button>
          <button
            type="button"
            className="col-span-1 h-11 rounded-lg border border-border text-sm text-muted"
            aria-label={t("Use the system keyboard", "Systemtastatur verwenden")}
            onClick={() => setNativeKeyboard(true)}
          >
            ⌨
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-contrast transition hover:opacity-90"
          onClick={submit}
        >
          {submitLabel ?? t("Load matrix", "Matrix laden")}
        </button>
        {onCancel && (
          <button type="button" className={`${small} h-9`} onClick={onCancel}>
            {t("Cancel", "Abbrechen")}
          </button>
        )}
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        <button type="button" className={small} onClick={() => fill("clear")}>
          {t("Clear", "Leeren")}
        </button>
        <button type="button" className={small} onClick={() => fill("identity")}>
          {t("Identity", "Einheitsmatrix")}
        </button>
        <button type="button" className={small} onClick={() => fill("random")}>
          {t("Random", "Zufällig")}
        </button>
        {current && (
          <button type="button" className={small} onClick={() => fill("current")}>
            {t("Use current state", "Aktuellen Stand übernehmen")}
          </button>
        )}
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>

      <p className="text-xs text-muted">
        {t(
          <>
            Empty cells count as 0. Enter decimals or fractions like <code>-3/4</code>. Tip: paste a whole matrix into any cell —
            from Excel, a Jupyter notebook (<code>[[2, -3], [5, -7]]</code>) or plain text.{" "}
            <span className="hidden sm:inline">Arrow keys move between cells, Enter goes to the next one, Ctrl+Enter loads.</span>
          </>,
          <>
            Leere Felder zählen als 0. Gib Dezimalzahlen oder Brüche wie <code>-3/4</code> ein. Tipp: Füge eine ganze Matrix in ein
            beliebiges Feld ein — aus Excel, einem Jupyter-Notebook (<code>[[2, -3], [5, -7]]</code>) oder als Text.{" "}
            <span className="hidden sm:inline">
              Pfeiltasten wechseln das Feld, Enter springt zum nächsten, Ctrl+Enter lädt.
            </span>
          </>,
        )}
      </p>
    </div>
  );
}

function Stepper({
  label,
  less,
  more,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  less: string;
  more: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const b = "flex h-8 w-8 items-center justify-center text-lg transition hover:bg-accent/10 disabled:opacity-30";
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted">{label}</span>
      <div className="inline-flex items-center overflow-hidden rounded-md border border-border">
        <button type="button" className={b} aria-label={less} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <span className="w-7 text-center font-mono" aria-live="polite">
          {value}
        </span>
        <button type="button" className={b} aria-label={more} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}
