import type { Matrix, Vector } from "./matrix";

export type Vec3 = [number, number, number];

export const add = (a: Vector, b: Vector): Vector => a.map((x, i) => x + (b[i] ?? 0));
export const sub = (a: Vector, b: Vector): Vector => a.map((x, i) => x - (b[i] ?? 0));
export const scale = (k: number, a: Vector): Vector => a.map((x) => k * x);
export const dot = (a: Vector, b: Vector): number => a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);
export const norm = (a: Vector): number => Math.sqrt(dot(a, a));

/** Angle between two vectors in radians, or null if one of them is the zero vector. */
export function angle(a: Vector, b: Vector): number | null {
  const d = norm(a) * norm(b);
  if (d < 1e-12) return null;
  return Math.acos(Math.min(1, Math.max(-1, dot(a, b) / d)));
}

/** Pads (or truncates) a 1-, 2- or 3-dimensional vector to 3D, for drawing. */
export const to3 = (v: Vector): Vec3 => [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];

export const column = (m: Matrix, j: number): Vector => m.map((row) => row[j]);

/** Matrix-vector product Ax for an (m×n)-matrix A and an n-vector x. */
export const matVec = (m: Matrix, x: Vector): Vector => m.map((row) => dot(row, x));

export const matAdd = (a: Matrix, b: Matrix): Matrix => a.map((row, i) => add(row, b[i]));
export const matSub = (a: Matrix, b: Matrix): Matrix => a.map((row, i) => sub(row, b[i]));
export const matScale = (k: number, a: Matrix): Matrix => a.map((row) => scale(k, row));

/**
 * (1 − t)·I + t·A for an (m×n)-matrix A, where I is the m×n "identity" (ones on
 * the diagonal). Used to animate a linear map from "doing nothing" to A.
 */
export function lerpFromIdentity(a: Matrix, t: number): Matrix {
  return a.map((row, i) => row.map((x, j) => (1 - t) * (i === j ? 1 : 0) + t * x));
}
