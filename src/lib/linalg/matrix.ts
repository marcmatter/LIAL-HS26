/**
 * Core matrix helpers shared by all linear algebra tools.
 * Matrices are stored row-major as plain number arrays.
 */
export type Matrix = number[][];
export type Vector = number[];

const EPSILON = 1e-10;

export function zeros(rows: number, cols: number): Matrix {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

export function identity(n: number): Matrix {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

export function isSquare(m: Matrix): boolean {
  return m.length > 0 && m.every((row) => row.length === m.length);
}

export function clone(m: Matrix): Matrix {
  return m.map((row) => [...row]);
}

/** Determinant via Gaussian elimination with partial pivoting. */
export function determinant(m: Matrix): number {
  if (!isSquare(m)) throw new Error("Determinant requires a square matrix.");
  const a = clone(m);
  const n = a.length;
  let det = 1;

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < EPSILON) return 0;
    if (pivot !== col) {
      [a[pivot], a[col]] = [a[col], a[pivot]];
      det = -det;
    }
    det *= a[col][col];
    for (let r = col + 1; r < n; r++) {
      const factor = a[r][col] / a[col][col];
      for (let c = col; c < n; c++) a[r][c] -= factor * a[col][c];
    }
  }
  return det;
}

/** Rounds tiny floating point noise so results display cleanly. */
export function formatNumber(x: number, digits = 6): string {
  if (Math.abs(x) < EPSILON) return "0";
  return Number(x.toFixed(digits)).toString();
}

/** Parses a cell string such as "3", "-2.5" or "1/3". Returns NaN if invalid. */
export function parseEntry(raw: string): number {
  const s = raw.trim();
  if (s === "") return 0;
  if (s.includes("/")) {
    const [num, den] = s.split("/").map((p) => Number(p.trim()));
    return den === 0 ? NaN : num / den;
  }
  return Number(s);
}
