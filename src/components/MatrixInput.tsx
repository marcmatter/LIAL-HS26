"use client";

import { useT } from "@/lib/i18n/lang";

interface MatrixInputProps {
  rows: number;
  cols: number;
  values: string[][];
  onChange: (values: string[][]) => void;
  label?: string;
}

/** Editable grid of matrix entries. Entries are kept as strings so users can type "-", "1/3", etc. */
export default function MatrixInput({ rows, cols, values, onChange, label }: MatrixInputProps) {
  const t = useT();
  const update = (r: number, c: number, v: string) => {
    const next = values.map((row) => [...row]);
    next[r][c] = v;
    onChange(next);
  };

  return (
    <div className="inline-flex flex-col items-start gap-2 self-start">
      {label && <span className="text-sm font-medium text-muted">{label}</span>}
      <div
        className="inline-grid gap-1.5 border-x-2 border-foreground/70 px-2 py-1 rounded-sm"
        style={{ gridTemplateColumns: `repeat(${cols}, 4rem)` }}
      >
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <input
              key={`${r}-${c}`}
              inputMode="decimal"
              aria-label={t(`Row ${r + 1}, column ${c + 1}`, `Zeile ${r + 1}, Spalte ${c + 1}`)}
              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              value={values[r]?.[c] ?? ""}
              onChange={(e) => update(r, c, e.target.value)}
            />
          )),
        )}
      </div>
    </div>
  );
}

/** Resizes a grid of string entries, keeping existing values. */
export function resizeGrid(values: string[][], rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => values[r]?.[c] ?? "0"),
  );
}
