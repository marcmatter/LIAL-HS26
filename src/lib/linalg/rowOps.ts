import { formatNumber, parseEntry, type Matrix } from "./matrix";

/**
 * Elementary row operations. Row indices are 0-based.
 *   add: R[row1] ← factor1·R[row1] + factor2·R[row2]
 *   sub: R[row1] ← factor1·R[row1] − factor2·R[row2]
 *   mul: R[row]  ← factor·R[row]
 *   swap: R[row1] ↔ R[row2]
 */
export type RowOp =
  | { type: "add" | "sub"; factor1: number; row1: number; factor2: number; row2: number }
  | { type: "mul"; factor: number; row: number }
  | { type: "swap"; row1: number; row2: number };

export function applyRowOp(m: Matrix, op: RowOp): Matrix {
  const next = m.map((row) => [...row]);
  switch (op.type) {
    case "add":
    case "sub": {
      const sign = op.type === "add" ? 1 : -1;
      next[op.row1] = m[op.row1].map(
        (x, col) => op.factor1 * x + sign * op.factor2 * m[op.row2][col],
      );
      break;
    }
    case "mul":
      next[op.row] = m[op.row].map((x) => op.factor * x);
      break;
    case "swap":
      next[op.row1] = m[op.row2];
      next[op.row2] = m[op.row1];
      break;
  }
  return next;
}

export function applyRowOps(m: Matrix, ops: RowOp[]): Matrix {
  return ops.reduce(applyRowOp, m);
}

const rowName = (row: number) => `R${row + 1}`;

function term(factor: number, row: number): string {
  if (factor === 1) return rowName(row);
  const f = formatNumber(factor, 7);
  return `${factor < 0 ? `(${f})` : f}·${rowName(row)}`;
}

/** Human-readable form, e.g. "R2 ← 2·R2 − 5·R1". */
export function describeRowOp(op: RowOp): string {
  switch (op.type) {
    case "add":
    case "sub":
      return `${rowName(op.row1)} ← ${term(op.factor1, op.row1)} ${op.type === "add" ? "+" : "−"} ${term(op.factor2, op.row2)}`;
    case "mul":
      return `${rowName(op.row)} ← ${term(op.factor, op.row)}`;
    case "swap":
      return `${rowName(op.row1)} ↔ ${rowName(op.row2)}`;
  }
}

/**
 * Parses a whitespace-separated matrix, one row per line.
 * Short rows are padded with zeros. Entries may be fractions like "1/3".
 */
export function parseMatrixText(text: string): { matrix: Matrix } | { error: string } {
  const rows: number[][] = [];
  for (const line of text.split("\n")) {
    const tokens = line.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const row: number[] = [];
    for (const token of tokens) {
      const value = parseEntry(token);
      if (!Number.isFinite(value)) {
        return { error: `Invalid entry "${token}" in row ${rows.length + 1}.` };
      }
      row.push(value);
    }
    rows.push(row);
  }
  if (rows.length === 0) return { error: "Enter at least one row." };
  const cols = Math.max(...rows.map((r) => r.length));
  return { matrix: rows.map((r) => [...r, ...Array(cols - r.length).fill(0)]) };
}
