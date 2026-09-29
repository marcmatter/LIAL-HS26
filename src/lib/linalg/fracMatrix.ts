import { Fraction } from "./fraction";
import type { FracMatrix } from "./rowOps";

/** Exact matrix algebra on fractions (SW03: multiplication, transpose, inverse). */

export const fromNumbers = (m: number[][]): FracMatrix => m.map((row) => row.map((x) => Fraction.parse(String(x))!));

export function identityF(n: number): FracMatrix {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? Fraction.ONE : Fraction.ZERO)));
}

export function mulF(a: FracMatrix, b: FracMatrix): FracMatrix {
  if (a[0]?.length !== b.length) throw new Error("The number of columns of A must equal the number of rows of B.");
  return a.map((row) => b[0].map((_, k) => row.reduce((s, x, j) => s.add(x.mul(b[j][k])), Fraction.ZERO)));
}

export const transposeF = (a: FracMatrix): FracMatrix => (a[0] ?? []).map((_, j) => a.map((row) => row[j]));

export const equalF = (a: FracMatrix, b: FracMatrix) =>
  a.length === b.length && a.every((row, i) => row.length === b[i].length && row.every((x, j) => x.sub(b[i][j]).isZero()));

export function isIdentityF(a: FracMatrix): boolean {
  return a.every((row, i) => row.length === a.length && row.every((x, j) => (i === j ? x.isOne() : x.isZero())));
}

/** A permutation matrix whose i-th row is the order[i]-th unit row (so PA has rows A[order[0]], A[order[1]], …). */
export function permutationMatrix(order: number[]): FracMatrix {
  return order.map((k) => order.map((_, j) => (j === k ? Fraction.ONE : Fraction.ZERO)));
}

export function isPermutationF(a: FracMatrix): boolean {
  const n = a.length;
  const onesPerRow = a.map((row) => row.filter((x) => x.isOne()).length);
  const zerosOk = a.every((row) => row.length === n && row.every((x) => x.isOne() || x.isZero()));
  const onesPerCol = a[0]?.map((_, j) => a.filter((row) => row[j].isOne()).length) ?? [];
  return zerosOk && onesPerRow.every((c) => c === 1) && onesPerCol.every((c) => c === 1);
}

export interface InverseResult {
  /** A⁻¹, or null when A is singular. */
  inverse: FracMatrix | null;
  /** For a singular A: a vector x ≠ 0 with Ax = 0. */
  nullVector: Fraction[] | null;
}

/** Inverse by Gauss-Jordan elimination on [A | E]. */
export function inverseF(a: FracMatrix): InverseResult {
  const n = a.length;
  const m = a.map((row, i) => [...row, ...identityF(n)[i]]);
  const pivotCols: number[] = [];
  let r = 0;
  for (let c = 0; c < n && r < n; c++) {
    const p = m.findIndex((row, i) => i >= r && !row[c].isZero());
    if (p === -1) continue;
    [m[r], m[p]] = [m[p], m[r]];
    const inv = Fraction.ONE.div(m[r][c]);
    m[r] = m[r].map((x) => x.mul(inv));
    for (let i = 0; i < n; i++) {
      if (i === r || m[i][c].isZero()) continue;
      const f = m[i][c];
      m[i] = m[i].map((x, j) => x.sub(f.mul(m[r][j])));
    }
    pivotCols.push(c);
    r++;
  }
  if (pivotCols.length === n) return { inverse: m.map((row) => row.slice(n)), nullVector: null };

  // Singular: set the first free variable to 1 and read off the pivot variables.
  const free = Array.from({ length: n }, (_, c) => c).find((c) => !pivotCols.includes(c))!;
  const x = Array.from({ length: n }, () => Fraction.ZERO);
  x[free] = Fraction.ONE;
  pivotCols.forEach((c, row) => (x[c] = m[row][free].neg()));
  return { inverse: null, nullVector: x };
}
