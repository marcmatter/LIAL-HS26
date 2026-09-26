"use client";

import { useMemo, useState, type DragEvent } from "react";
import { formatNumber, parseEntry, type Matrix } from "@/lib/linalg/matrix";
import { applyRowOps, describeRowOp, parseMatrixText, type RowOp } from "@/lib/linalg/rowOps";
import { gaussPresetGroups } from "@/tools/data/gaussPresets";

/** An operation waiting for its second row (chosen with a row's "R" button). */
type Pending =
  | { type: "add" | "sub"; factor: number; row: number }
  | { type: "swap"; row: number }
  | null;

interface Factor {
  numer: string;
  denom: string;
}
type FactorField = keyof Factor;

const ONE: Factor = { numer: "1", denom: "1" };
const DRAG_TYPE = "application/x-lial-entry";

const cleanText = (text: string) => text.replace(/^\s*\n/gm, "");
const initialText = cleanText(gaussPresetGroups[0].presets[0].text);
const initialMatrix = (parseMatrixText(initialText) as { matrix: Matrix }).matrix;

function parseFactorPart(s: string): number {
  return s.trim() === "" ? 1 : parseEntry(s);
}

const buttonClass =
  "rounded-md border border-border bg-surface px-2.5 py-1 text-sm transition hover:border-accent disabled:opacity-40 disabled:hover:border-border";

export default function GaussTool() {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [base, setBase] = useState<Matrix>(initialMatrix);
  const [done, setDone] = useState<RowOp[]>([]);
  const [undone, setUndone] = useState<RowOp[]>([]);
  const [factors, setFactors] = useState<Factor[]>(() => initialMatrix.map(() => ONE));
  const [pending, setPending] = useState<Pending>(null);
  const [armed, setArmed] = useState<{ row: number; field: FactorField } | null>(null);

  const matrix = useMemo(() => applyRowOps(base, done), [base, done]);

  function load(source: string) {
    const cleaned = cleanText(source);
    setText(cleaned);
    const parsed = parseMatrixText(cleaned);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setBase(parsed.matrix);
    setDone([]);
    setUndone([]);
    setFactors(parsed.matrix.map(() => ONE));
    setPending(null);
    setArmed(null);
  }

  function setFactorField(row: number, field: FactorField, value: string) {
    setFactors((fs) => fs.map((f, i) => (i === row ? { ...f, [field]: value } : f)));
  }

  /** Reads a row's factor (numer / denom) and resets its fields to 1. */
  function takeFactor(row: number): number {
    const { numer, denom } = factors[row];
    const factor = parseFactorPart(numer) / parseFactorPart(denom);
    setFactors((fs) => fs.map((f, i) => (i === row ? ONE : f)));
    return Number.isFinite(factor) ? factor : 1;
  }

  function commit(op: RowOp) {
    setDone((d) => [...d, op]);
    setUndone([]);
    setPending(null);
    setArmed(null);
  }

  function startOp(type: "add" | "sub" | "swap", row: number) {
    setArmed(null);
    setPending(type === "swap" ? { type, row } : { type, factor: takeFactor(row), row });
  }

  function selectRow(row: number) {
    if (pending === null) {
      commit({ type: "mul", factor: takeFactor(row), row });
    } else if (pending.type === "swap") {
      commit({ type: "swap", row1: pending.row, row2: row });
    } else {
      commit({
        type: pending.type,
        factor1: pending.factor,
        row1: pending.row,
        factor2: takeFactor(row),
        row2: row,
      });
    }
  }

  function undo() {
    if (done.length === 0) return;
    setUndone([...undone, done[done.length - 1]]);
    setDone(done.slice(0, -1));
    setPending(null);
  }

  function redo() {
    if (undone.length === 0) return;
    setDone([...done, undone[undone.length - 1]]);
    setUndone(undone.slice(0, -1));
    setPending(null);
  }

  function reset() {
    setDone([]);
    setUndone([]);
    setPending(null);
  }

  function handleEntryDrag(e: DragEvent, value: number) {
    e.dataTransfer.setData(DRAG_TYPE, String(value));
    e.dataTransfer.effectAllowed = "copy";
  }

  function handleFactorDrop(e: DragEvent, row: number, field: FactorField) {
    const value = e.dataTransfer.getData(DRAG_TYPE);
    if (!value) return;
    e.preventDefault();
    setFactorField(row, field, value);
  }

  function handleEntryClick(value: number) {
    if (!armed) return;
    setFactorField(armed.row, armed.field, String(value));
    setArmed(null);
  }

  const status = (() => {
    if (!pending) return "Pick an operation on the target row, or press a row's R button to multiply it by its factor.";
    const target = `R${pending.row + 1}`;
    if (pending.type === "swap") return `${target} ↔ ?  —  press the R button of the row to swap with.`;
    const f = pending.factor === 1 ? "" : `${formatNumber(pending.factor, 7)}·`;
    const sign = pending.type === "add" ? "+" : "−";
    return `${target} ← ${f}${target} ${sign} factor·R?  —  press the R button of the second row.`;
  })();

  const factorInput = (row: number, field: FactorField) => (
    <input
      aria-label={`Row ${row + 1} factor ${field === "numer" ? "numerator" : "denominator"}`}
      inputMode="decimal"
      className={`w-20 rounded-md border bg-background px-2 py-1 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent ${
        armed?.row === row && armed.field === field ? "border-accent" : "border-border"
      }`}
      value={factors[row]?.[field] ?? "1"}
      onChange={(e) => setFactorField(row, field, e.target.value)}
      onFocus={() => setArmed({ row, field })}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => handleFactorDrop(e, row, field)}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Examples</h2>
        <div className="flex flex-col gap-2">
          {gaussPresetGroups.map((group) => (
            <div key={group.label} className="flex flex-wrap items-center gap-2">
              <span className="w-full shrink-0 text-sm text-muted sm:w-28">{group.label}</span>
              {group.presets.map((preset) => (
                <button key={preset.label} type="button" className={buttonClass} onClick={() => load(preset.text)}>
                  {preset.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        <label htmlFor="gauss-input" className="mt-2 text-sm text-muted">
          Custom matrix — one row per line, entries separated by spaces (fractions like 1/3 allowed)
        </label>
        <textarea
          id="gauss-input"
          rows={5}
          spellCheck={false}
          className="w-full rounded-md border border-border bg-surface p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <button type="button" className={buttonClass} onClick={() => load(text)}>
            Generate
          </button>
          {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Interactive</h2>
        <p className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm" aria-live="polite">
          {status}
        </p>

        <div className="overflow-x-auto pb-2">
          <table className="border-separate border-spacing-x-1.5 border-spacing-y-1.5">
            <tbody>
              {matrix.map((row, r) => {
                const isPending = pending?.row === r;
                return (
                  <tr key={r}>
                    <th scope="row" className="pr-1 text-left text-sm font-medium text-muted">
                      R{r + 1}
                    </th>
                    {row.map((value, c) => (
                      <td key={c}>
                        <button
                          type="button"
                          draggable
                          title="Drag onto a factor field to copy this value"
                          onDragStart={(e) => handleEntryDrag(e, value)}
                          onClick={() => handleEntryClick(value)}
                          className={`w-24 cursor-grab rounded-md border px-2 py-2 text-center font-mono text-sm active:cursor-grabbing ${
                            isPending ? "border-accent bg-accent/10" : "border-border bg-surface"
                          }`}
                        >
                          {formatNumber(value, 7)}
                        </button>
                      </td>
                    ))}
                    <td className="whitespace-nowrap pl-3">
                      <span className="flex items-center gap-1.5 text-muted">
                        ∗ {factorInput(r, "numer")} / {factorInput(r, "denom")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap pl-3">
                      <span className="flex items-center gap-1.5">
                        <button type="button" title="Add a multiple of another row to this row" className={buttonClass} onClick={() => startOp("add", r)}>
                          +=
                        </button>
                        <button type="button" title="Subtract a multiple of another row from this row" className={buttonClass} onClick={() => startOp("sub", r)}>
                          −=
                        </button>
                        <button type="button" title="Swap this row with another row" className={buttonClass} onClick={() => startOp("swap", r)}>
                          ↔
                        </button>
                        <button
                          type="button"
                          title={pending ? "Use this row as the second row" : "Multiply this row by its factor"}
                          className={`${buttonClass} ml-2 font-medium ${pending ? "border-accent" : ""}`}
                          onClick={() => selectRow(r)}
                        >
                          R{r + 1}
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} onClick={undo} disabled={done.length === 0}>
            Undo
          </button>
          <button type="button" className={buttonClass} onClick={redo} disabled={undone.length === 0}>
            Redo
          </button>
          <button type="button" className={buttonClass} onClick={reset} disabled={done.length === 0}>
            Reset
          </button>
          {pending && (
            <button type="button" className={buttonClass} onClick={() => setPending(null)}>
              Cancel operation
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Steps</h2>
          {done.length === 0 ? (
            <p className="text-sm text-muted">No row operations yet.</p>
          ) : (
            <ol className="list-decimal pl-6 font-mono text-sm">
              {done.map((op, i) => (
                <li key={i}>{describeRowOp(op)}</li>
              ))}
            </ol>
          )}
        </div>
        <div className="flex flex-col gap-2 text-sm text-muted">
          <h2 className="text-lg font-semibold text-foreground">How to use</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Each row has a factor <span className="font-mono">numerator / denominator</span>. Factors reset to 1 after use.
            </li>
            <li>
              <span className="font-mono">+=</span> / <span className="font-mono">−=</span> on row i, then{" "}
              <span className="font-mono">Rj</span>: Ri ← f<sub>i</sub>·Ri ± f<sub>j</sub>·Rj.
            </li>
            <li>
              <span className="font-mono">↔</span> on row i, then <span className="font-mono">Rj</span>: swap the rows.
            </li>
            <li>
              <span className="font-mono">Rj</span> alone: Rj ← f<sub>j</sub>·Rj.
            </li>
            <li>Drag a matrix entry onto a factor field to copy its value — or click the field, then the entry.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
