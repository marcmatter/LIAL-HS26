import { Fraction } from "./fraction";
import { identityF } from "./fracMatrix";
import type { FracMatrix } from "./rowOps";

/**
 * LU decomposition (LR-Zerlegung) PA = LU as taught in SW03: eliminate below each
 * pivot with elimination matrices E_ij; swap rows (P) only when a pivot is zero.
 * Every step keeps a snapshot so the decomposition can be shown step by step.
 */

export type LuStep =
  | {
      kind: "swap";
      /** 0-based rows that were swapped. */
      rows: [number, number];
      column: number;
      P: FracMatrix;
      L: FracMatrix;
      U: FracMatrix;
    }
  | {
      kind: "eliminate";
      /** Entry u_ij that is eliminated (0-based). */
      i: number;
      j: number;
      /** Multiplier l_ij = u_ij / u_jj. */
      l: Fraction;
      /** Elimination matrix E_ij (identity with −l_ij at (i, j)). */
      E: FracMatrix;
      before: FracMatrix;
      P: FracMatrix;
      L: FracMatrix;
      U: FracMatrix;
    };

export interface LuResult {
  P: FracMatrix;
  L: FracMatrix;
  U: FracMatrix;
  steps: LuStep[];
  /** True if a row swap was needed. */
  swapped: boolean;
  /** True if a zero pivot could not be fixed by swapping (A is singular). */
  singular: boolean;
}

const clone = (m: FracMatrix) => m.map((row) => [...row]);

export function luDecompose(a: FracMatrix): LuResult {
  const n = a.length;
  let U = clone(a);
  let L = identityF(n);
  let P = identityF(n);
  const steps: LuStep[] = [];
  let swapped = false;
  let singular = false;

  for (let j = 0; j < n; j++) {
    if (U[j][j].isZero()) {
      const p = U.findIndex((row, i) => i > j && !row[j].isZero());
      if (p === -1) {
        singular = true;
        continue;
      }
      swapped = true;
      [U[j], U[p]] = [U[p], U[j]];
      [P[j], P[p]] = [P[p], P[j]];
      // Multipliers already stored in L travel with their rows.
      L = clone(L);
      for (let k = 0; k < j; k++) [L[j][k], L[p][k]] = [L[p][k], L[j][k]];
      U = clone(U);
      P = clone(P);
      steps.push({ kind: "swap", rows: [j, p], column: j, P, L, U });
    }
    for (let i = j + 1; i < n; i++) {
      if (U[i][j].isZero()) continue;
      const l = U[i][j].div(U[j][j]);
      const before = U;
      U = clone(U);
      U[i] = U[i].map((x, k) => x.sub(l.mul(U[j][k])));
      L = clone(L);
      L[i][j] = l;
      const E = identityF(n);
      E[i][j] = l.neg();
      steps.push({ kind: "eliminate", i, j, l, E, before, P, L, U });
    }
  }
  return { P, L, U, steps, swapped, singular };
}

export interface SubstitutionLine {
  index: number;
  value: Fraction;
  /** Human-readable computation, e.g. "y₂ = (21 − 4·5) / 1 = 1". */
  text: string;
}

const subs = (i: number) => String(i + 1).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);
const par = (f: Fraction) => (f.isNegative() || !f.isInteger() ? `(${f})` : `${f}`);

function formatLine(name: string, rhs: Fraction, terms: string[], diag: Fraction, value: Fraction): string {
  if (!terms.length) return diag.isOne() ? `${name} = ${value}` : `${name} = ${rhs} / ${par(diag)} = ${value}`;
  const numerator = `${rhs} − ${terms.join(" − ")}`;
  return diag.isOne() ? `${name} = ${numerator} = ${value}` : `${name} = (${numerator}) / ${par(diag)} = ${value}`;
}

/** Forward substitution for Ly = b (L lower triangular). */
export function forwardSubstitution(L: FracMatrix, b: Fraction[]): SubstitutionLine[] {
  const y: Fraction[] = [];
  return b.map((bi, i) => {
    let sum = Fraction.ZERO;
    const terms: string[] = [];
    for (let k = 0; k < i; k++) {
      if (L[i][k].isZero()) continue;
      sum = sum.add(L[i][k].mul(y[k]));
      terms.push(`${par(L[i][k])}·${par(y[k])}`);
    }
    y[i] = bi.sub(sum).div(L[i][i]);
    const text = formatLine(`y${subs(i)}`, bi, terms, L[i][i], y[i]);
    return { index: i, value: y[i], text };
  });
}

/** Back substitution for Ux = y (U upper triangular with non-zero diagonal). */
export function backSubstitution(U: FracMatrix, y: Fraction[]): SubstitutionLine[] {
  const n = y.length;
  const x: Fraction[] = Array(n);
  const lines: SubstitutionLine[] = [];
  for (let i = n - 1; i >= 0; i--) {
    let sum = Fraction.ZERO;
    const terms: string[] = [];
    for (let k = i + 1; k < n; k++) {
      if (U[i][k].isZero()) continue;
      sum = sum.add(U[i][k].mul(x[k]));
      terms.push(`${par(U[i][k])}·${par(x[k])}`);
    }
    x[i] = y[i].sub(sum).div(U[i][i]);
    const text = formatLine(`x${subs(i)}`, y[i], terms, U[i][i], x[i]);
    lines.push({ index: i, value: x[i], text });
  }
  return lines;
}
