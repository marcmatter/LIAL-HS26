"use client";

import type { ReactNode } from "react";
import { Fraction } from "@/lib/linalg/fraction";
import { formatNumber, type Matrix } from "@/lib/linalg/matrix";
import { useT } from "@/lib/i18n/lang";

/** Parses "3", "-2.5" or "1/3"; an empty field counts as 0. Returns null when invalid. */
export function parseNum(s: string): number | null {
  if (s.trim() === "") return 0;
  return Fraction.parse(s)?.toNumber() ?? null;
}

/** Parses a grid of strings; null if any entry is invalid. */
export function parseGrid(values: string[][]): Matrix | null {
  const m = values.map((row) => row.map(parseNum));
  return m.some((row) => row.some((x) => x === null)) ? null : (m as Matrix);
}

export const fmt = (x: number) => formatNumber(x, 4).replace(/^-/, "−");

/** Wraps a term in parentheses when it is negative, e.g. for "3 · (−2)". */
export const paren = (x: number) => (x < 0 ? `(${fmt(x)})` : fmt(x));

export function resize(values: string[][], rows: number, cols: number, fill = "0"): string[][] {
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => values[r]?.[c] ?? fill));
}

/** Column colours match the axes: the j-th column is the image of the j-th basis vector. */
export const columnColors = ["var(--axis-x)", "var(--axis-y)", "var(--axis-z)"];

/** Round brackets around a matrix or column vector, as on the lecture slides. */
export function Paren({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex px-3 py-1">
      <ParenStroke side="left" />
      <ParenStroke side="right" />
      {children}
    </span>
  );
}

function ParenStroke({ side }: { side: "left" | "right" }) {
  return (
    <svg
      className={`absolute inset-y-0 ${side === "left" ? "left-0" : "right-0"} h-full w-2.5 text-foreground/70`}
      viewBox="0 0 10 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={side === "left" ? "M9 1 Q0 50 9 99" : "M1 1 Q10 50 1 99"}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface MatrixEditorProps {
  name: string;
  color?: string;
  values: string[][];
  onChange: (values: string[][]) => void;
  /** Colour each column (used for matrices acting as linear maps). */
  colorColumns?: boolean;
}

export function MatrixEditor({ name, color, values, onChange, colorColumns }: MatrixEditorProps) {
  const t = useT();
  const cols = values[0]?.length ?? 0;
  return (
    <div className="inline-flex items-center gap-2">
      <span className="font-serif text-lg font-semibold italic" style={{ color }}>
        {name}
      </span>
      <span className="text-muted">=</span>
      <Paren>
        <span className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}>
          {values.map((row, r) =>
            row.map((v, c) => {
              const invalid = parseNum(v) === null;
              return (
                <input
                  key={`${r}-${c}`}
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label={t(`${name}: row ${r + 1}, column ${c + 1}`, `${name}: Zeile ${r + 1}, Spalte ${c + 1}`)}
                  aria-invalid={invalid}
                  className={`h-8 w-14 rounded-md border bg-background px-1 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent ${
                    invalid ? "border-danger" : "border-border"
                  }`}
                  style={colorColumns && !invalid ? { borderBottomColor: columnColors[c], borderBottomWidth: 2 } : undefined}
                  value={v}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onChange(values.map((row2, i) => row2.map((x, j) => (i === r && j === c ? e.target.value : x))))}
                />
              );
            }),
          )}
        </span>
      </Paren>
    </div>
  );
}

/** Read-only matrix or column vector; cells can be numbers or preformatted content. */
export function MatrixView({
  cells,
  color,
  colorColumns,
  highlight,
}: {
  cells: (number | ReactNode)[][];
  color?: string;
  colorColumns?: boolean;
  highlight?: boolean;
}) {
  const cols = cells[0]?.length ?? 0;
  return (
    <Paren>
      <span
        className={`grid items-center gap-x-3 gap-y-1 font-mono text-sm ${highlight ? "font-semibold" : ""}`}
        style={{ gridTemplateColumns: `repeat(${cols}, auto)`, color }}
      >
        {cells.map((row, r) =>
          row.map((v, c) => (
            <span
              key={`${r}-${c}`}
              className="whitespace-nowrap text-center"
              style={colorColumns ? { color: columnColors[c] } : undefined}
            >
              {typeof v === "number" ? fmt(v) : v}
            </span>
          )),
        )}
      </span>
    </Paren>
  );
}

export const asColumn = (v: (number | ReactNode)[]) => v.map((x) => [x]);

export function Sym({ children }: { children: ReactNode }) {
  return <span className="px-0.5 font-mono text-lg text-muted">{children}</span>;
}

/** A row of terms making up one equation, wrapping on small screens. */
export function Equation({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-2 gap-y-3">{children}</div>;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`rounded-md px-3 py-1 text-sm transition ${
            value === o.value ? "bg-accent text-accent-contrast" : "text-muted hover:text-foreground"
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function NumberField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const invalid = parseNum(value) === null;
  return (
    <label className="inline-flex items-center gap-2">
      <span className="font-serif text-lg italic">{name}</span>
      <span className="text-muted">=</span>
      <input
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={invalid}
        className={`h-8 w-16 rounded-md border bg-background px-1 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent ${
          invalid ? "border-danger" : "border-border"
        }`}
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function SizeSelect({
  label,
  value,
  onChange,
  options = [2, 3],
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  options?: number[];
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <select
        className="h-8 rounded-md border border-border bg-surface px-2"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Card({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Legend({ items }: { items: { color: string; label: ReactNode; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-1.5">
          <span
            className="inline-block w-5 border-t-[3px]"
            style={{ borderColor: it.color, borderTopStyle: it.dashed ? "dashed" : "solid" }}
            aria-hidden
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
