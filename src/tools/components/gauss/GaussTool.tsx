"use client";

import { useEffect, useMemo, useState } from "react";
import { Fraction } from "@/lib/linalg/fraction";
import {
  affectedRows,
  analyseEchelon,
  applyRowOp,
  applyRowOps,
  describeRowOp,
  matrixToText,
  parseMatrixText,
  referenceSteps,
  type FracMatrix,
  type RowOp,
} from "@/lib/linalg/rowOps";
import { challengeStars, recordChallenge, useProgress } from "@/lib/game/progress";
import { gaussPresetGroups } from "@/tools/data/gaussPresets";
import MatrixGridEditor from "@/components/matrix-editor/MatrixGridEditor";
import FactorInput, { type Factor, type FactorField } from "./FactorInput";
import Value, { formatValue, type DisplayMode } from "./Value";
import { useT } from "@/lib/i18n/lang";

/** An operation waiting for its second row. */
type Pending = { type: "add" | "sub" | "swap"; row: number } | null;

const ONE: Factor = { numer: "1", denom: "1" };
const DRAG_TYPE = "application/x-lial-entry";
const CUSTOM = "custom";

const presets = gaussPresetGroups.flatMap((g, gi) =>
  g.presets.map((p, pi) => ({ id: `${gi}-${pi}`, label: p.label, group: g.label, text: cleanText(p.text) })),
);

function cleanText(text: string) {
  return text.replace(/^\s*\n/gm, "").replace(/\s+$/, "");
}

/** Divider for augmented matrices: [A | I] when cols = 2·rows, otherwise before the last column. */
function autoDivider(m: FracMatrix): number | null {
  const rows = m.length;
  const cols = m[0]?.length ?? 0;
  if (rows > 1 && cols === 2 * rows) return rows;
  return cols >= 2 ? cols - 1 : null;
}

function parseFactor(f: Factor): Fraction | null {
  const numer = f.numer.trim() === "" ? Fraction.ONE : Fraction.parse(f.numer);
  const denom = f.denom.trim() === "" ? Fraction.ONE : Fraction.parse(f.denom);
  if (!numer || !denom || denom.isZero()) return null;
  return numer.div(denom);
}

const initial = presets[0];
const initialMatrix = (parseMatrixText(initial.text) as { matrix: FracMatrix }).matrix;

const btn =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40";

const Kbd = ({ children }: { children: string }) => (
  <kbd className="hidden rounded border border-border px-1 font-mono text-[0.7rem] text-muted sm:inline">{children}</kbd>
);

export default function GaussTool() {
  // `t` is used for row names below, so the translation helper is `tt`.
  const tt = useT();
  const [sourceId, setSourceId] = useState(initial.id);
  const [editorOpen, setEditorOpen] = useState(false);
  // Remounts the editor (fresh copy of the current matrix) every time it opens.
  const [editorKey, setEditorKey] = useState(0);

  const [base, setBase] = useState<FracMatrix>(initialMatrix);
  const [timeline, setTimeline] = useState<RowOp[]>([]);
  const [cursor, setCursor] = useState(0);

  const [factors, setFactors] = useState<Factor[]>(() => initialMatrix.map(() => ONE));
  const [pending, setPending] = useState<Pending>(null);
  const [hover, setHover] = useState<{ row: number; scale: boolean } | null>(null);
  const [armed, setArmed] = useState<{ row: number; field: FactorField } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ rows: number[]; id: number }>({ rows: [], id: 0 });

  const [mode, setMode] = useState<DisplayMode>("fraction");
  const [divider, setDivider] = useState<number | null>(() => autoDivider(initialMatrix));
  const [copied, setCopied] = useState(false);

  const matrix = useMemo(() => applyRowOps(base, timeline.slice(0, cursor)), [base, timeline, cursor]);
  const info = useMemo(() => analyseEchelon(matrix, divider), [matrix, divider]);

  // Challenge: reach reduced row echelon form in as few steps as possible.
  const progress = useProgress();
  const par = useMemo(() => referenceSteps(base, divider), [base, divider]);
  const challengeKey = `gauss:${matrixToText(base)}|${divider ?? "-"}`;
  const bestStars = progress.challenges[challengeKey] ?? 0;
  const solved = info.isReduced && cursor > 0;
  const stars = solved ? challengeStars(cursor, par) : 0;
  useEffect(() => {
    if (solved) recordChallenge(challengeKey, cursor, par);
  }, [solved, challengeKey, cursor, par]);
  const cols = matrix[0]?.length ?? 0;
  const fmt = (f: Fraction) => formatValue(f, mode);

  // ---- loading ---------------------------------------------------------------

  function loadMatrix(m: FracMatrix, id: string, augmented = true) {
    setSourceId(id);
    setBase(m);
    setTimeline([]);
    setCursor(0);
    setFactors(m.map(() => ONE));
    setPending(null);
    setMessage(null);
    setFlash({ rows: [], id: 0 });
    setDivider(augmented ? autoDivider(m) : null);
  }

  function openEditor(open: boolean) {
    if (open) setEditorKey((k) => k + 1);
    setEditorOpen(open);
  }

  // ---- operations ------------------------------------------------------------

  function setFactorField(row: number, field: FactorField, value: string) {
    setFactors((fs) => fs.map((f, i) => (i === row ? { ...f, [field]: value } : f)));
  }

  /** Builds the operation that choosing `row` would perform, or an error message. */
  function buildOp(row: number, scale: boolean): RowOp | string | null {
    if (!pending && !scale) return null;
    if (pending?.type === "swap") return { type: "swap", row1: pending.row, row2: row };

    const target = pending ? pending.row : row;
    const f1 = parseFactor(factors[target]);
    if (!f1) return tt(`The factor of R${target + 1} is not a valid number.`, `Der Faktor von R${target + 1} ist keine gültige Zahl.`);
    if (f1.isZero())
      return tt(
        `R${target + 1} would be multiplied by 0 — that is not an elementary row operation.`,
        `R${target + 1} würde mit 0 multipliziert — das ist keine elementare Zeilenumformung.`,
      );
    if (!pending) return { type: "mul", factor: f1, row };

    const f2 = parseFactor(factors[row]);
    if (!f2) return tt(`The factor of R${row + 1} is not a valid number.`, `Der Faktor von R${row + 1} ist keine gültige Zahl.`);
    return { type: pending.type, factor1: f1, row1: pending.row, factor2: f2, row2: row };
  }

  function choose(row: number, scale: boolean) {
    const op = buildOp(row, scale);
    if (op === null) return;
    if (typeof op === "string") {
      setMessage(op);
      return;
    }
    const touched = new Set([pending?.row ?? row, row]);
    setFactors((fs) => fs.map((f, i) => (touched.has(i) && op.type !== "swap" ? ONE : f)));
    setTimeline([...timeline.slice(0, cursor), op]);
    setCursor(cursor + 1);
    setFlash({ rows: affectedRows(op), id: flash.id + 1 });
    setPending(null);
    setHover(null);
    setMessage(null);
  }

  function startOp(type: "add" | "sub" | "swap", row: number) {
    setMessage(null);
    setPending(pending?.type === type && pending.row === row ? null : { type, row });
  }

  function jumpTo(step: number) {
    if (step < 0 || step > timeline.length || step === cursor) return;
    const op = step < cursor ? timeline[cursor - 1] : timeline[cursor];
    setFlash({ rows: Math.abs(step - cursor) === 1 ? affectedRows(op) : [], id: flash.id + 1 });
    setCursor(step);
    setPending(null);
    setMessage(null);
  }

  const undo = () => jumpTo(cursor - 1);
  const redo = () => jumpTo(cursor + 1);

  async function copyMatrix() {
    try {
      await navigator.clipboard.writeText(matrixToText(matrix, fmt));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setMessage(tt("Copying to the clipboard is not available in this browser.", "Kopieren in die Zwischenablage ist in diesem Browser nicht möglich."));
    }
  }

  // Keyboard shortcuts: Esc cancels, Ctrl/⌘+Z undoes, Ctrl/⌘+Shift+Z or Ctrl+Y redoes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select")) return;
      if (e.key === "Escape") {
        setPending(null);
        setMessage(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- preview & status ------------------------------------------------------

  const previewOp = hover ? buildOp(hover.row, hover.scale) : null;
  const validPreview = previewOp && typeof previewOp !== "string" ? previewOp : null;
  const preview = validPreview ? applyRowOp(matrix, validPreview) : null;
  const previewRows = validPreview ? affectedRows(validPreview) : [];

  const status = (() => {
    if (message) return { tone: "danger" as const, text: message };
    if (validPreview) {
      return { tone: "accent" as const, text: `${describeRowOp(validPreview, fmt)}   — ${tt("click to apply", "klicken zum Anwenden")}` };
    }
    if (pending) {
      const t = `R${pending.row + 1}`;
      const text =
        pending.type === "swap"
          ? `${t} ↔ ?   — ${tt("click the row to swap with", "klicke die Zeile zum Tauschen")}`
          : `${t} ← ${t} ${pending.type === "add" ? "+" : "−"} ${tt("factor", "Faktor")} · R?   — ${tt("click the second row (its factor is used)", "klicke die zweite Zeile (ihr Faktor wird verwendet)")}`;
      return { tone: "accent" as const, text };
    }
    return {
      tone: "muted" as const,
      text: tt(
        "Choose +=, −= or ↔ on the row you want to change — or press · R to multiply a row by its factor.",
        "Wähle +=, −= oder ↔ bei der Zeile, die du ändern willst — oder drücke · R, um eine Zeile mit ihrem Faktor zu multiplizieren.",
      ),
    };
  })();

  const reached = info.isReduced
    ? tt("Reduced row echelon form", "Reduzierte Zeilenstufenform")
    : info.isRowEchelon
      ? tt("Row echelon form", "Zeilenstufenform")
      : null;

  // ---- render ----------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      {/* Source toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Matrix</span>
            <select
              className="h-9 min-w-44 rounded-md border border-border bg-surface px-2"
              value={sourceId}
              onChange={(e) => {
                const preset = presets.find((p) => p.id === e.target.value);
                const parsed = preset && parseMatrixText(preset.text);
                if (parsed && "matrix" in parsed) {
                  loadMatrix(parsed.matrix, preset.id);
                  openEditor(false);
                } else {
                  openEditor(true);
                }
              }}
            >
              {gaussPresetGroups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {presets
                    .filter((p) => p.group === g.label)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                </optgroup>
              ))}
              <option value={CUSTOM}>{tt("Custom…", "Eigene…")}</option>
            </select>
          </label>
          <button
            type="button"
            className={`${btn} h-9 ${editorOpen ? "border-accent" : ""}`}
            aria-expanded={editorOpen}
            onClick={() => openEditor(!editorOpen)}
          >
            ✎ {editorOpen ? tt("Close editor", "Editor schliessen") : tt("Enter your own matrix", "Eigene Matrix eingeben")}
          </button>

          <div className="ml-auto flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">{tt("Augmented divider", "Trennlinie (erweitert)")}</span>
              <select
                className="h-9 rounded-md border border-border bg-surface px-2"
                value={divider ?? "none"}
                onChange={(e) => setDivider(e.target.value === "none" ? null : Number(e.target.value))}
              >
                <option value="none">{tt("None", "Keiner")}</option>
                {Array.from({ length: Math.max(0, cols - 1) }, (_, i) => i + 1).map((c) => (
                  <option key={c} value={c}>
                    {tt(`After column ${c}`, `Nach Spalte ${c}`)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-muted">{tt("Numbers", "Zahlen")}</span>
              <div role="radiogroup" aria-label={tt("Number format", "Zahlenformat")} className="inline-flex h-9 rounded-md border border-border p-0.5">
                {(["fraction", "decimal"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    className={`rounded px-3 text-sm capitalize transition ${mode === m ? "bg-accent text-accent-contrast" : "text-muted hover:text-foreground"}`}
                    onClick={() => setMode(m)}
                  >
                    {m === "fraction" ? tt("Fractions", "Brüche") : tt("Decimals", "Dezimalzahlen")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {editorOpen && (
          <div className="border-t border-border pt-4">
            <MatrixGridEditor
              key={editorKey}
              initial={base.map((row) => row.map(String))}
              initialAugmented={divider !== null}
              current={cursor > 0 ? matrix.map((row) => row.map(String)) : undefined}
              submitLabel={tt("Load into workspace", "In Arbeitsbereich laden")}
              onSubmit={(m, augmented) => {
                loadMatrix(m, CUSTOM, augmented);
                openEditor(false);
              }}
              onCancel={() => openEditor(false)}
            />
          </div>
        )}
      </div>

      {/* Workspace */}
      <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {presets.find((p) => p.id === sourceId)?.label ?? tt("Custom matrix", "Eigene Matrix")}
            <span className="ml-2 text-sm font-normal text-muted">
              {matrix.length} × {cols}
            </span>
          </h2>
          {reached && (
            <span className="rounded-full border border-success/40 bg-success/10 px-3 py-1 text-sm font-medium text-success">
              ✓ {reached}
            </span>
          )}
        </div>

        {solved ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm">
            <span className="text-2xl tracking-tight text-success" aria-label={tt(`${stars} of 3 stars`, `${stars} von 3 Sternen`)}>
              {"★".repeat(stars)}
              <span className="opacity-30">{"★".repeat(3 - stars)}</span>
            </span>
            <span className="flex-1">
              {tt(
                <>
                  <strong>Challenge solved</strong> in {cursor} {cursor === 1 ? "step" : "steps"} (par {par}).
                </>,
                <>
                  <strong>Challenge gelöst</strong> in {cursor} {cursor === 1 ? "Schritt" : "Schritten"} (Par {par}).
                </>,
              )}{" "}
              {stars === 3
                ? tt("Perfect — within par!", "Perfekt — innerhalb von Par!")
                : tt(
                    `Solve it in ${stars === 2 ? par : par + 2} steps or fewer for ${stars === 2 ? "★★★" : "★★"}.`,
                    `Schaffe es in höchstens ${stars === 2 ? par : par + 2} Schritten für ${stars === 2 ? "★★★" : "★★"}.`,
                  )}
            </span>
            {stars < 3 && (
              <button type="button" className={btn} onClick={() => jumpTo(0)}>
                {tt("Try again", "Nochmal versuchen")}
              </button>
            )}
          </div>
        ) : (
          par > 0 && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border px-3 py-2 text-sm text-muted">
              <span>
                🎯 <strong className="text-foreground">Challenge:</strong>{" "}
                {tt("reach the reduced row echelon form", "erreiche die reduzierte Zeilenstufenform")}
              </span>
              <span>
                Par <strong className="font-mono text-foreground">{par}</strong>
              </span>
              <span>
                {tt("Your steps", "Deine Schritte")} <strong className="font-mono text-foreground">{cursor}</strong>
              </span>
              <span title={tt("Best result for this matrix", "Bestes Ergebnis für diese Matrix")}>
                {tt("Best", "Bestwert")}{" "}
                <span className="text-accent">{"★".repeat(bestStars)}</span>
                <span className="opacity-40">{"☆".repeat(3 - bestStars)}</span>
              </span>
            </p>
          )
        )}

        <p
          aria-live="polite"
          className={`flex min-h-10 items-center gap-3 rounded-md border px-3 py-2 font-mono text-sm ${
            status.tone === "danger"
              ? "border-danger/40 bg-danger/10 text-danger"
              : status.tone === "accent"
                ? "border-accent/40 bg-accent/10"
                : "border-border bg-surface text-muted"
          }`}
        >
          <span className="flex-1 whitespace-pre-wrap">{status.text}</span>
          {pending && (
            <button type="button" className={`${btn} h-7 font-sans`} onClick={() => setPending(null)}>
              {tt("Cancel", "Abbrechen")} <Kbd>Esc</Kbd>
            </button>
          )}
        </p>

        <p className="-mb-2 text-xs text-muted sm:hidden">Swipe sideways for the row controls →</p>
        <div className="overflow-x-auto pb-1">
          <div className="flex w-max items-stretch gap-2">
            {/* Row labels */}
            <div className="flex flex-col py-1">
              {matrix.map((_, r) => (
                <div key={r} className="flex h-16 items-center pr-1 text-sm font-medium text-muted">
                  R{r + 1}
                </div>
              ))}
            </div>

            {/* Matrix with brackets */}
            <div className="relative px-3 py-1">
              <span className="absolute inset-y-0 left-0 w-2 rounded-l-md border-y-2 border-l-2 border-foreground/70" aria-hidden />
              <span className="absolute inset-y-0 right-0 w-2 rounded-r-md border-y-2 border-r-2 border-foreground/70" aria-hidden />
              <div role="grid" aria-label="Matrix" className="grid" style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}>
                {matrix.map((row, r) => {
                  const isTarget = pending?.row === r;
                  const selectable = pending !== null;
                  const shown = preview && previewRows.includes(r) ? preview[r] : row;
                  return row.map((_, c) => {
                    const value = shown[c];
                    const isPivot = info.pivots[r] === c;
                    const isPreview = shown !== row;
                    return (
                      <div
                        key={`${r}-${c}`}
                        role="gridcell"
                        className={`flex h-16 items-center px-1 ${c === divider ? "ml-1 border-l-2 border-foreground/40 pl-2" : ""}`}
                        onMouseEnter={() => selectable && setHover({ row: r, scale: false })}
                        onMouseLeave={() => setHover(null)}
                      >
                        <button
                          key={flash.rows.includes(r) ? `f${flash.id}` : "s"}
                          type="button"
                          draggable
                          aria-label={tt(`Row ${r + 1}, column ${c + 1}: ${value.toString()}`, `Zeile ${r + 1}, Spalte ${c + 1}: ${value.toString()}`)}
                          title={
                            pending
                              ? tt(`Use R${r + 1} as the second row`, `R${r + 1} als zweite Zeile verwenden`)
                              : armed
                                ? tt("Click to copy into the selected factor", "Klicken, um in den gewählten Faktor zu kopieren")
                                : tt("Drag onto a factor to copy this value", "Auf einen Faktor ziehen, um den Wert zu kopieren")
                          }
                          onMouseDown={(e) => armed && !pending && e.preventDefault()}
                          onDragStart={(e) => {
                            e.dataTransfer.setData(DRAG_TYPE, row[c].toString());
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          onClick={() => {
                            if (pending) choose(r, false);
                            else if (armed) setFactorField(armed.row, armed.field, row[c].toString());
                          }}
                          className={[
                            "flex h-12 min-w-[3.5rem] items-center justify-center rounded-md border px-2 font-mono text-sm transition-colors sm:min-w-[4.5rem]",
                            flash.rows.includes(r) ? "animate-flash" : "",
                            isPreview
                              ? "border-dashed border-accent text-accent"
                              : isTarget
                                ? "border-accent bg-accent/10"
                                : "border-border bg-surface",
                            isPivot && !isPreview ? "font-bold text-accent" : "",
                            value.isZero() && !isPreview ? "text-muted" : "",
                            selectable ? "cursor-pointer" : armed ? "cursor-copy hover:ring-2 hover:ring-accent" : "cursor-grab",
                          ].join(" ")}
                        >
                          <Value value={value} mode={mode} />
                        </button>
                      </div>
                    );
                  });
                })}
              </div>
            </div>

            {/* Row controls */}
            <div className="flex flex-col py-1">
              {matrix.map((_, r) => {
                const isTarget = pending?.row === r;
                const opButton = (type: "add" | "sub" | "swap", label: string, title: string) => {
                  const active = isTarget && pending?.type === type;
                  return (
                    <button
                      type="button"
                      title={title}
                      aria-pressed={active}
                      className={`h-8 w-9 font-mono text-sm transition ${active ? "bg-accent text-accent-contrast" : "hover:bg-accent/10"}`}
                      onClick={() => startOp(type, r)}
                    >
                      {label}
                    </button>
                  );
                };
                return (
                  <div key={r} className="flex h-16 items-center gap-3 pl-1">
                    <FactorInput
                      row={r}
                      factor={factors[r] ?? ONE}
                      invalid={parseFactor(factors[r] ?? ONE) === null}
                      armedField={armed?.row === r ? armed.field : null}
                      dragType={DRAG_TYPE}
                      onChange={(field, value) => setFactorField(r, field, value)}
                      onArm={(field) => setArmed(field ? { row: r, field } : null)}
                    />
                    <div className="inline-flex divide-x divide-border overflow-hidden rounded-md border border-border bg-surface">
                      {opButton("add", "+=", tt(`R${r + 1} ← factor·R${r + 1} + factor·(second row)`, `R${r + 1} ← Faktor·R${r + 1} + Faktor·(zweite Zeile)`))}
                      {opButton("sub", "−=", tt(`R${r + 1} ← factor·R${r + 1} − factor·(second row)`, `R${r + 1} ← Faktor·R${r + 1} − Faktor·(zweite Zeile)`))}
                      {opButton("swap", "↔", tt(`Swap R${r + 1} with another row`, `R${r + 1} mit einer anderen Zeile tauschen`))}
                    </div>
                    <button
                      type="button"
                      title={pending ? tt(`Use R${r + 1} as the second row`, `R${r + 1} als zweite Zeile verwenden`) : tt(`Multiply R${r + 1} by its factor`, `R${r + 1} mit ihrem Faktor multiplizieren`)}
                      className={`${btn} w-16 whitespace-nowrap px-2 font-medium ${pending ? "border-accent bg-accent/10" : ""}`}
                      onMouseEnter={() => setHover({ row: r, scale: !pending })}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover({ row: r, scale: !pending })}
                      onBlur={() => setHover(null)}
                      onClick={() => choose(r, !pending)}
                    >
                      {pending ? "→ " : "· "}R{r + 1}
                    </button>
                    {info.contradictions.includes(r) && (
                      <span className="whitespace-nowrap rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                        0 = c ≠ 0 · no solution
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <button type="button" className={btn} onClick={undo} disabled={cursor === 0}>
            {tt("Undo", "Rückgängig")} <Kbd>Ctrl Z</Kbd>
          </button>
          <button type="button" className={btn} onClick={redo} disabled={cursor === timeline.length}>
            {tt("Redo", "Wiederholen")} <Kbd>Ctrl Y</Kbd>
          </button>
          <button type="button" className={btn} onClick={() => jumpTo(0)} disabled={cursor === 0}>
            {tt("Reset", "Zurücksetzen")}
          </button>
          <button type="button" className={`${btn} ml-auto`} onClick={copyMatrix}>
            {copied ? tt("Copied ✓", "Kopiert ✓") : tt("Copy matrix", "Matrix kopieren")}
          </button>
        </div>
      </div>

      {/* Steps & help */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{tt("Steps", "Schritte")}</h2>
          <ol className="flex flex-col gap-0.5 font-mono text-sm">
            {[null, ...timeline].map((op, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => jumpTo(i)}
                  aria-current={i === cursor ? "step" : undefined}
                  className={`flex w-full items-baseline gap-3 rounded-md px-2 py-1 text-left transition ${
                    i === cursor ? "bg-accent/10 text-foreground" : i > cursor ? "text-muted line-through decoration-muted/50" : "hover:bg-surface"
                  }`}
                >
                  <span className="w-6 shrink-0 text-right text-muted">{i}.</span>
                  <span>{op ? describeRowOp(op, fmt) : tt("Start", "Start")}</span>
                </button>
              </li>
            ))}
          </ol>
          {timeline.length > 0 && <p className="text-xs text-muted">{tt("Click a step to jump back to it.", "Klicke auf einen Schritt, um dorthin zurückzuspringen.")}</p>}
        </section>

        <section className="flex flex-col gap-2 text-sm text-muted">
          <h2 className="text-lg font-semibold text-foreground">{tt("How it works", "So funktioniert’s")}</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              {tt(
                "Every row has a factor, written as a fraction. It resets to 1 after it has been used.",
                "Jede Zeile hat einen Faktor, geschrieben als Bruch. Nach der Verwendung springt er auf 1 zurück.",
              )}
            </li>
            <li>
              <span className="font-mono text-foreground">+=</span> / <span className="font-mono text-foreground">−=</span>{" "}
              {tt("on row i, then click row j", "bei Zeile i, dann Zeile j anklicken")}: R<sub>i</sub> ← f<sub>i</sub>·R<sub>i</sub> ±
              f<sub>j</sub>·R<sub>j</sub>. {tt("Hover a row to preview the result.", "Fahre über eine Zeile für eine Vorschau.")}
            </li>
            <li>
              <span className="font-mono text-foreground">↔</span>{" "}
              {tt("on row i, then click row j: swap the two rows.", "bei Zeile i, dann Zeile j anklicken: die beiden Zeilen tauschen.")}
            </li>
            <li>
              <span className="font-mono text-foreground">· Rj</span>:{" "}
              {tt("multiply row j by its factor.", "Zeile j mit ihrem Faktor multiplizieren.")}
            </li>
            <li>
              {tt(
                "Drag an entry onto a factor to copy it — or select the factor field, then click the entry.",
                "Ziehe einen Eintrag auf einen Faktor, um ihn zu kopieren — oder wähle das Faktorfeld und klicke dann den Eintrag.",
              )}
            </li>
            <li>
              {tt(
                "Leading entries (pivots) are highlighted; a badge appears once the matrix is in (reduced) row echelon form.",
                "Führende Einträge (Pivots) sind hervorgehoben; ein Abzeichen erscheint, sobald die Matrix in (reduzierter) Zeilenstufenform ist.",
              )}
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
