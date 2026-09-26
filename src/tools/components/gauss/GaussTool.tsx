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
import FactorInput, { type Factor, type FactorField } from "./FactorInput";
import Value, { formatValue, type DisplayMode } from "./Value";

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
  const [sourceId, setSourceId] = useState(initial.id);
  const [editorOpen, setEditorOpen] = useState(false);
  const [text, setText] = useState(initial.text);
  const [parseError, setParseError] = useState<string | null>(null);

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

  function load(source: string, id: string) {
    const parsed = parseMatrixText(source);
    if ("error" in parsed) {
      setParseError(parsed.error);
      return false;
    }
    setParseError(null);
    setSourceId(id);
    setText(cleanText(source));
    setBase(parsed.matrix);
    setTimeline([]);
    setCursor(0);
    setFactors(parsed.matrix.map(() => ONE));
    setPending(null);
    setMessage(null);
    setFlash({ rows: [], id: 0 });
    setDivider(autoDivider(parsed.matrix));
    return true;
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
    if (!f1) return `The factor of R${target + 1} is not a valid number.`;
    if (f1.isZero()) return `R${target + 1} would be multiplied by 0 — that is not an elementary row operation.`;
    if (!pending) return { type: "mul", factor: f1, row };

    const f2 = parseFactor(factors[row]);
    if (!f2) return `The factor of R${row + 1} is not a valid number.`;
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
      setMessage("Copying to the clipboard is not available in this browser.");
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
      return { tone: "accent" as const, text: `${describeRowOp(validPreview, fmt)}   — click to apply` };
    }
    if (pending) {
      const t = `R${pending.row + 1}`;
      const text =
        pending.type === "swap"
          ? `${t} ↔ ?   — click the row to swap with`
          : `${t} ← ${t} ${pending.type === "add" ? "+" : "−"} factor · R?   — click the second row (its factor is used)`;
      return { tone: "accent" as const, text };
    }
    return {
      tone: "muted" as const,
      text: "Choose +=, −= or ↔ on the row you want to change — or press · R to multiply a row by its factor.",
    };
  })();

  const reached = info.isReduced ? "Reduced row echelon form" : info.isRowEchelon ? "Row echelon form" : null;

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
                if (preset) {
                  load(preset.text, preset.id);
                  setEditorOpen(false);
                } else {
                  setEditorOpen(true);
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
              <option value={CUSTOM}>Custom…</option>
            </select>
          </label>
          <button type="button" className={`${btn} h-9`} aria-expanded={editorOpen} onClick={() => setEditorOpen(!editorOpen)}>
            {editorOpen ? "Close editor" : "Edit matrix"}
          </button>

          <div className="ml-auto flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Augmented divider</span>
              <select
                className="h-9 rounded-md border border-border bg-surface px-2"
                value={divider ?? "none"}
                onChange={(e) => setDivider(e.target.value === "none" ? null : Number(e.target.value))}
              >
                <option value="none">None</option>
                {Array.from({ length: Math.max(0, cols - 1) }, (_, i) => i + 1).map((c) => (
                  <option key={c} value={c}>
                    After column {c}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Numbers</span>
              <div role="radiogroup" aria-label="Number format" className="inline-flex h-9 rounded-md border border-border p-0.5">
                {(["fraction", "decimal"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    className={`rounded px-3 text-sm capitalize transition ${mode === m ? "bg-accent text-accent-contrast" : "text-muted hover:text-foreground"}`}
                    onClick={() => setMode(m)}
                  >
                    {m === "fraction" ? "Fractions" : "Decimals"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {editorOpen && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <label htmlFor="gauss-input" className="text-sm text-muted">
              One row per line, entries separated by spaces. Decimals and fractions like <code>-3/4</code> are allowed.
            </label>
            <textarea
              id="gauss-input"
              rows={Math.min(8, Math.max(3, text.split("\n").length + 1))}
              spellCheck={false}
              className="w-full rounded-md border border-border bg-surface p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && load(text, CUSTOM)) setEditorOpen(false);
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`${btn} border-accent bg-accent text-accent-contrast hover:opacity-90`}
                onClick={() => load(text, CUSTOM) && setEditorOpen(false)}
              >
                Load matrix
              </button>
              <button type="button" className={btn} onClick={() => setText(matrixToText(matrix))}>
                Use current matrix
              </button>
              <Kbd>Ctrl ↵</Kbd>
              {parseError && <span className="text-sm text-danger">{parseError}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Workspace */}
      <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {presets.find((p) => p.id === sourceId)?.label ?? "Custom matrix"}
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
            <span className="text-2xl tracking-tight text-success" aria-label={`${stars} of 3 stars`}>
              {"★".repeat(stars)}
              <span className="opacity-30">{"★".repeat(3 - stars)}</span>
            </span>
            <span className="flex-1">
              <strong>Challenge solved</strong> in {cursor} {cursor === 1 ? "step" : "steps"} (par {par}).{" "}
              {stars === 3 ? "Perfect — within par!" : `Solve it in ${stars === 2 ? par : par + 2} steps or fewer for ${stars === 2 ? "★★★" : "★★"}.`}
            </span>
            {stars < 3 && (
              <button type="button" className={btn} onClick={() => jumpTo(0)}>
                Try again
              </button>
            )}
          </div>
        ) : (
          par > 0 && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border px-3 py-2 text-sm text-muted">
              <span>
                🎯 <strong className="text-foreground">Challenge:</strong> reach the reduced row echelon form
              </span>
              <span>
                Par <strong className="font-mono text-foreground">{par}</strong>
              </span>
              <span>
                Your steps <strong className="font-mono text-foreground">{cursor}</strong>
              </span>
              <span title="Best result for this matrix">
                Best{" "}
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
              Cancel <Kbd>Esc</Kbd>
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
                          aria-label={`Row ${r + 1}, column ${c + 1}: ${value.toString()}`}
                          title={
                            pending
                              ? `Use R${r + 1} as the second row`
                              : armed
                                ? "Click to copy into the selected factor"
                                : "Drag onto a factor to copy this value"
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
                      {opButton("add", "+=", `R${r + 1} ← factor·R${r + 1} + factor·(second row)`)}
                      {opButton("sub", "−=", `R${r + 1} ← factor·R${r + 1} − factor·(second row)`)}
                      {opButton("swap", "↔", `Swap R${r + 1} with another row`)}
                    </div>
                    <button
                      type="button"
                      title={pending ? `Use R${r + 1} as the second row` : `Multiply R${r + 1} by its factor`}
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
            Undo <Kbd>Ctrl Z</Kbd>
          </button>
          <button type="button" className={btn} onClick={redo} disabled={cursor === timeline.length}>
            Redo <Kbd>Ctrl Y</Kbd>
          </button>
          <button type="button" className={btn} onClick={() => jumpTo(0)} disabled={cursor === 0}>
            Reset
          </button>
          <button type="button" className={`${btn} ml-auto`} onClick={copyMatrix}>
            {copied ? "Copied ✓" : "Copy matrix"}
          </button>
        </div>
      </div>

      {/* Steps & help */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Steps</h2>
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
                  <span>{op ? describeRowOp(op, fmt) : "Start"}</span>
                </button>
              </li>
            ))}
          </ol>
          {timeline.length > 0 && <p className="text-xs text-muted">Click a step to jump back to it.</p>}
        </section>

        <section className="flex flex-col gap-2 text-sm text-muted">
          <h2 className="text-lg font-semibold text-foreground">How it works</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Every row has a factor, written as a fraction. It resets to 1 after it has been used.</li>
            <li>
              <span className="font-mono text-foreground">+=</span> / <span className="font-mono text-foreground">−=</span> on
              row i, then click row j: R<sub>i</sub> ← f<sub>i</sub>·R<sub>i</sub> ± f<sub>j</sub>·R<sub>j</sub>. Hover a row
              to preview the result.
            </li>
            <li>
              <span className="font-mono text-foreground">↔</span> on row i, then click row j: swap the two rows.
            </li>
            <li>
              <span className="font-mono text-foreground">· Rj</span>: multiply row j by its factor.
            </li>
            <li>Drag an entry onto a factor to copy it — or select the factor field, then click the entry.</li>
            <li>Leading entries (pivots) are highlighted; a badge appears once the matrix is in (reduced) row echelon form.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
