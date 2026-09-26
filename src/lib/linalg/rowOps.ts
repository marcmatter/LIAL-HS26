import { Fraction } from "./fraction";

export type FracMatrix = Fraction[][];

/**
 * Elementary row operations. Row indices are 0-based.
 *   add: R[row1] ← factor1·R[row1] + factor2·R[row2]
 *   sub: R[row1] ← factor1·R[row1] − factor2·R[row2]
 *   mul: R[row]  ← factor·R[row]
 *   swap: R[row1] ↔ R[row2]
 */
export type RowOp =
  | { type: "add" | "sub"; factor1: Fraction; row1: number; factor2: Fraction; row2: number }
  | { type: "mul"; factor: Fraction; row: number }
  | { type: "swap"; row1: number; row2: number };

export function applyRowOp(m: FracMatrix, op: RowOp): FracMatrix {
  const next = [...m];
  switch (op.type) {
    case "add":
    case "sub":
      next[op.row1] = m[op.row1].map((x, col) => {
        const other = op.factor2.mul(m[op.row2][col]);
        const own = op.factor1.mul(x);
        return op.type === "add" ? own.add(other) : own.sub(other);
      });
      break;
    case "mul":
      next[op.row] = m[op.row].map((x) => op.factor.mul(x));
      break;
    case "swap":
      next[op.row1] = m[op.row2];
      next[op.row2] = m[op.row1];
      break;
  }
  return next;
}

export function applyRowOps(m: FracMatrix, ops: RowOp[]): FracMatrix {
  return ops.reduce(applyRowOp, m);
}

/** Rows whose values an operation changes. */
export function affectedRows(op: RowOp): number[] {
  if (op.type === "mul") return [op.row];
  if (op.type === "swap") return op.row1 === op.row2 ? [] : [op.row1, op.row2];
  return [op.row1];
}

const rowName = (row: number) => `R${row + 1}`;

function term(factor: Fraction, row: number, format: (f: Fraction) => string): string {
  if (factor.isOne()) return rowName(row);
  const f = format(factor);
  return `${factor.isNegative() || f.includes("/") ? `(${f})` : f}·${rowName(row)}`;
}

/** Human-readable form, e.g. "R2 ← 2·R2 − 5·R1". */
export function describeRowOp(op: RowOp, format: (f: Fraction) => string = String): string {
  switch (op.type) {
    case "add":
    case "sub":
      return `${rowName(op.row1)} ← ${term(op.factor1, op.row1, format)} ${op.type === "add" ? "+" : "−"} ${term(op.factor2, op.row2, format)}`;
    case "mul":
      return `${rowName(op.row)} ← ${term(op.factor, op.row, format)}`;
    case "swap":
      return `${rowName(op.row1)} ↔ ${rowName(op.row2)}`;
  }
}

/**
 * Parses a whitespace-separated matrix, one row per line.
 * Short rows are padded with zeros. Entries may be decimals or fractions like "1/3".
 */
export function parseMatrixText(text: string): { matrix: FracMatrix } | { error: string } {
  const rows: Fraction[][] = [];
  for (const line of text.split("\n")) {
    const tokens = line.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const row: Fraction[] = [];
    for (const token of tokens) {
      const value = Fraction.parse(token);
      if (!value) return { error: `Invalid entry "${token}" in row ${rows.length + 1}.` };
      row.push(value);
    }
    rows.push(row);
  }
  if (rows.length === 0) return { error: "Enter at least one row." };
  const cols = Math.max(...rows.map((r) => r.length));
  return { matrix: rows.map((r) => [...r, ...Array<Fraction>(cols - r.length).fill(Fraction.ZERO)]) };
}

export function matrixToText(m: FracMatrix, format: (f: Fraction) => string = String): string {
  const cells = m.map((row) => row.map(format));
  const width = Math.max(...cells.flat().map((c) => c.length));
  return cells.map((row) => row.map((c) => c.padStart(width)).join("  ")).join("\n");
}

export interface EchelonInfo {
  /** Column of each row's leading (first non-zero) coefficient, or -1 for zero rows. */
  pivots: number[];
  /** Rows of the form 0 … 0 | c with c ≠ 0 (only when an augmented divider is set). */
  contradictions: number[];
  isRowEchelon: boolean;
  isReduced: boolean;
}

/**
 * Analyses the coefficient part (columns before `divider`, or all columns when
 * divider is null) for row echelon and reduced row echelon form.
 */
export function analyseEchelon(m: FracMatrix, divider: number | null): EchelonInfo {
  const coeffCols = divider ?? m[0]?.length ?? 0;
  const pivots = m.map((row) => row.slice(0, coeffCols).findIndex((x) => !x.isZero()));
  const contradictions =
    divider === null
      ? []
      : m.flatMap((row, r) => (pivots[r] === -1 && row.slice(divider).some((x) => !x.isZero()) ? [r] : []));

  let isRowEchelon = true;
  let last = -1;
  let seenZeroRow = false;
  for (const p of pivots) {
    if (p === -1) {
      seenZeroRow = true;
    } else if (seenZeroRow || p <= last) {
      isRowEchelon = false;
      break;
    } else {
      last = p;
    }
  }

  const isReduced =
    isRowEchelon &&
    pivots.every(
      (p, r) => p === -1 || (m[r][p].isOne() && m.every((row, i) => i === r || row[p].isZero())),
    );

  return { pivots, contradictions, isRowEchelon, isReduced };
}

/**
 * Number of row operations a straightforward Gauss-Jordan elimination needs to
 * reach reduced row echelon form (on the columns before `divider`): one swap per
 * missing pivot, one operation per entry eliminated above or below a pivot and
 * one scaling per pivot that is not already 1. Used as "par" for challenges.
 */
export function referenceSteps(start: FracMatrix, divider: number | null): number {
  let m = start;
  const coeffCols = divider ?? m[0]?.length ?? 0;
  let steps = 0;
  let r = 0;
  for (let c = 0; c < coeffCols && r < m.length; c++) {
    const p = m.findIndex((row, i) => i >= r && !row[c].isZero());
    if (p === -1) continue;
    if (p !== r) {
      m = applyRowOp(m, { type: "swap", row1: r, row2: p });
      steps++;
    }
    for (let i = 0; i < m.length; i++) {
      if (i === r || m[i][c].isZero()) continue;
      m = applyRowOp(m, { type: "sub", factor1: m[r][c], row1: i, factor2: m[i][c], row2: r });
      steps++;
    }
    if (!m[r][c].isOne()) {
      m = applyRowOp(m, { type: "mul", factor: Fraction.ONE.div(m[r][c]), row: r });
      steps++;
    }
    r++;
  }
  return steps;
}
