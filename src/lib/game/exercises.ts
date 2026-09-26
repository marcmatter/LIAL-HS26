import { determinant, formatNumber, type Matrix } from "../linalg/matrix";
import { add, dot, matVec, scale, sub } from "../linalg/vector";
import type { Topic } from "./progress";

/** A given quantity: a vector/matrix (as rows) or a scalar. */
export interface Given {
  label: string;
  value: Matrix | number;
  color?: "a" | "b";
}

export interface Exercise {
  topic: Topic;
  difficulty: 1 | 2 | 3;
  task: string;
  given: Given[];
  /** Expected answer as rows; a scalar answer is [[x]]. */
  answer: Matrix;
  answerLabel: string;
  hint: string;
  solution: string[];
}

export interface TopicInfo {
  id: Topic;
  icon: string;
  title: string;
  description: string;
}

export const topics: TopicInfo[] = [
  { id: "vec-add", icon: "➕", title: "Vector addition", description: "a + b and a − b, component by component." },
  { id: "vec-comb", icon: "🧮", title: "Linear combinations", description: "λ·a and λ·a + μ·b." },
  { id: "dot", icon: "•", title: "Dot product", description: "a • b — and spotting orthogonal vectors." },
  { id: "length", icon: "📏", title: "Length of a vector", description: "|a| = √(a • a)." },
  { id: "mat-add", icon: "▦", title: "Matrix addition", description: "A + B, A − B and λ·A." },
  { id: "mat-vec", icon: "✖️", title: "Matrix × vector", description: "Ax, row by row." },
  { id: "det", icon: "🔳", title: "Determinant", description: "2×2 and 3×3 determinants." },
  { id: "system", icon: "🧩", title: "Linear systems", description: "Solve Ax = b." },
];

// ---- helpers -------------------------------------------------------------------

const rand = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
function randNonZero(lo: number, hi: number, exclude: number[] = []) {
  for (;;) {
    const x = rand(lo, hi);
    if (x !== 0 && !exclude.includes(x)) return x;
  }
}
const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const vec = (n: number, r: number) => Array.from({ length: n }, () => rand(-r, r));
const mat = (m: number, n: number, r: number): Matrix => Array.from({ length: m }, () => vec(n, r));
const col = (v: number[]): Matrix => v.map((x) => [x]);
const f = (x: number) => formatNumber(x, 4).replace(/^-/, "−");
const p = (x: number) => (x < 0 ? `(${f(x)})` : f(x));
const vecStr = (v: number[]) => `(${v.map(f).join(", ")})`;
const sub_ = ["₁", "₂", "₃"];

// ---- generators ---------------------------------------------------------------------

type Generator = (d: 1 | 2 | 3) => Omit<Exercise, "topic" | "difficulty">;

const generators: Record<Topic, Generator> = {
  "vec-add": (d) => {
    const n = d === 1 ? 2 : 3;
    const r = d === 3 ? 12 : 6;
    const a = vec(n, r);
    const b = vec(n, r);
    const minus = Math.random() < 0.5;
    const res = minus ? sub(a, b) : add(a, b);
    const op = minus ? "−" : "+";
    return {
      task: `Compute a ${op} b.`,
      given: [
        { label: "a", value: col(a), color: "a" },
        { label: "b", value: col(b), color: "b" },
      ],
      answer: col(res),
      answerLabel: `a ${op} b`,
      hint: `Work component by component: the first component is a₁ ${op} b₁ = ${f(a[0])} ${op} ${p(b[0])}.`,
      solution: a.map((x, i) => `component ${i + 1}: ${f(x)} ${op} ${p(b[i])} = ${f(res[i])}`),
    };
  },

  "vec-comb": (d) => {
    const n = d === 3 ? 3 : 2;
    const a = vec(n, 5);
    const b = vec(n, 5);
    const l = randNonZero(-4, 4, [1]);
    if (d === 1) {
      const res = scale(l, a);
      return {
        task: "Compute λ·a.",
        given: [
          { label: "λ", value: l },
          { label: "a", value: col(a), color: "a" },
        ],
        answer: col(res),
        answerLabel: "λ·a",
        hint: "Multiply every component of a by λ.",
        solution: a.map((x, i) => `component ${i + 1}: ${p(l)} · ${p(x)} = ${f(res[i])}`),
      };
    }
    const m = randNonZero(-4, 4);
    const res = add(scale(l, a), scale(m, b));
    return {
      task: "Compute the linear combination λ·a + μ·b.",
      given: [
        { label: "λ", value: l },
        { label: "μ", value: m },
        { label: "a", value: col(a), color: "a" },
        { label: "b", value: col(b), color: "b" },
      ],
      answer: col(res),
      answerLabel: "λa + μb",
      hint: "Scale first (λ·a and μ·b), then add component by component.",
      solution: [
        `λ·a = ${vecStr(scale(l, a))},  μ·b = ${vecStr(scale(m, b))}`,
        ...a.map((x, i) => `component ${i + 1}: ${p(l)}·${p(x)} + ${p(m)}·${p(b[i])} = ${f(res[i])}`),
      ],
    };
  },

  dot: (d) => {
    const n = d === 1 ? 2 : 3;
    const r = d === 3 ? 8 : 5;
    const a = vec(n, r);
    let b = vec(n, r);
    // Every now and then an orthogonal pair, so a • b = 0 comes up.
    if (Math.random() < 0.3) {
      const k = randNonZero(-2, 2);
      b = n === 2 ? [-k * a[1], k * a[0]] : [k * a[1], -k * a[0], 0];
    }
    const res = dot(a, b);
    return {
      task: "Compute the dot product a • b. Are a and b orthogonal?",
      given: [
        { label: "a", value: col(a), color: "a" },
        { label: "b", value: col(b), color: "b" },
      ],
      answer: [[res]],
      answerLabel: "a • b",
      hint: `a • b = a₁b₁ + a₂b₂${n === 3 ? " + a₃b₃" : ""}. It is 0 exactly when a ⊥ b.`,
      solution: [
        `a • b = ${a.map((x, i) => `${p(x)}·${p(b[i])}`).join(" + ")} = ${f(res)}`,
        res === 0 ? "a • b = 0, so a and b are orthogonal (a ⊥ b)." : "a • b ≠ 0, so a and b are not orthogonal.",
      ],
    };
  },

  length: (d) => {
    const base = d === 1 ? pick([[3, 4], [6, 8], [5, 12], [8, 15]]) : pick([[1, 2, 2], [2, 3, 6], [1, 4, 8], [4, 4, 7], [2, 6, 9], [2, 10, 11]]);
    const k = d === 3 ? rand(1, 3) : 1;
    const a = [...base].sort(() => Math.random() - 0.5).map((x) => x * k * (Math.random() < 0.5 ? -1 : 1));
    const len = Math.sqrt(dot(a, a));
    return {
      task: "Compute the length |a|.",
      given: [{ label: "a", value: col(a), color: "a" }],
      answer: [[len]],
      answerLabel: "|a|",
      hint: "|a| = √(a • a) = √(a₁² + a₂² …) — square each component, add, take the square root.",
      solution: [`|a| = √(${a.map((x) => `${p(x)}²`).join(" + ")}) = √${f(dot(a, a))} = ${f(len)}`],
    };
  },

  "mat-add": (d) => {
    const [m, n] = d === 1 ? [2, 2] : d === 2 ? pick([[2, 3], [3, 2]]) : [3, 3];
    const A = mat(m, n, 6);
    const B = mat(m, n, 6);
    const op = pick(["+", "−", "λ"] as const);
    if (op === "λ") {
      const l = randNonZero(-3, 3, [1]);
      const res = A.map((row) => scale(l, row));
      return {
        task: "Compute λ·A.",
        given: [
          { label: "λ", value: l },
          { label: "A", value: A },
        ],
        answer: res,
        answerLabel: "λ·A",
        hint: "Multiply every entry of A by λ.",
        solution: [`entry (1,1): ${p(l)} · ${p(A[0][0])} = ${f(res[0][0])} — and the same for every other entry.`],
      };
    }
    const res = A.map((row, i) => (op === "+" ? add(row, B[i]) : sub(row, B[i])));
    return {
      task: `Compute A ${op} B.`,
      given: [
        { label: "A", value: A },
        { label: "B", value: B },
      ],
      answer: res,
      answerLabel: `A ${op} B`,
      hint: `Combine the entries in the same position: entry (1,1) is ${f(A[0][0])} ${op} ${p(B[0][0])}.`,
      solution: res.map((row, i) => `row ${i + 1}: ${row.map((x, j) => `${f(A[i][j])} ${op} ${p(B[i][j])} = ${f(x)}`).join(",  ")}`),
    };
  },

  "mat-vec": (d) => {
    const [m, n] = d === 1 ? [2, 2] : d === 2 ? pick([[2, 3], [3, 2], [2, 2]]) : [3, 3];
    const r = d === 3 ? 6 : 4;
    const A = mat(m, n, r);
    const x = vec(n, r);
    const res = matVec(A, x);
    return {
      task: "Compute the matrix-vector product Ax.",
      given: [
        { label: "A", value: A },
        { label: "x", value: col(x), color: "a" },
      ],
      answer: col(res),
      answerLabel: "Ax",
      hint: `Entry i of Ax is (row i of A) • x. Entry 1: ${A[0].map((a, j) => `${p(a)}·${p(x[j])}`).join(" + ")}.`,
      solution: A.map((row, i) => `entry ${i + 1}: ${row.map((a, j) => `${p(a)}·${p(x[j])}`).join(" + ")} = ${f(res[i])}`),
    };
  },

  det: (d) => {
    if (d === 1) {
      const A = mat(2, 2, 6);
      const res = determinant(A);
      return {
        task: "Compute the determinant det A.",
        given: [{ label: "A", value: A }],
        answer: [[res]],
        answerLabel: "det A",
        hint: "For a 2×2 matrix: det A = a·d − b·c (main diagonal minus the other diagonal).",
        solution: [`det A = ${p(A[0][0])}·${p(A[1][1])} − ${p(A[0][1])}·${p(A[1][0])} = ${f(res)}`],
      };
    }
    const A = mat(3, 3, d === 2 ? 3 : 5);
    const res = Math.round(determinant(A));
    const minor = (j: number) => {
      const [c1, c2] = [0, 1, 2].filter((k) => k !== j);
      return A[1][c1] * A[2][c2] - A[1][c2] * A[2][c1];
    };
    return {
      task: "Compute the determinant det A.",
      given: [{ label: "A", value: A }],
      answer: [[res]],
      answerLabel: "det A",
      hint: "Expand along the first row: det A = a₁₁·M₁₁ − a₁₂·M₁₂ + a₁₃·M₁₃, where M₁ⱼ is the 2×2 determinant left after deleting row 1 and column j (or use the rule of Sarrus).",
      solution: [
        ...[0, 1, 2].map((j) => `M₁${sub_[j]} = ${f(minor(j))}`),
        `det A = ${p(A[0][0])}·${p(minor(0))} − ${p(A[0][1])}·${p(minor(1))} + ${p(A[0][2])}·${p(minor(2))} = ${f(res)}`,
      ],
    };
  },

  system: (d) => {
    const n = d === 1 ? 2 : 3;
    const r = d === 3 ? 5 : 3;
    let A: Matrix;
    do A = mat(n, n, r);
    while (Math.abs(determinant(A)) < 0.5);
    const x = vec(n, d === 1 ? 4 : 5);
    const b = matVec(A, x);
    const names = ["x", "y", "z"];
    return {
      task: `Solve the linear system Ax = b for x = (${names.slice(0, n).join(", ")}).`,
      given: [
        { label: "A", value: A },
        { label: "b", value: col(b), color: "b" },
      ],
      answer: col(x),
      answerLabel: "x",
      hint: "Row-reduce the augmented matrix (A | b) to reduced row echelon form — the last column is then the solution. The Gauss-Jordan tool helps.",
      solution: [
        `x = ${vecStr(x)}`,
        ...A.map((row, i) => `check row ${i + 1}: ${row.map((a, j) => `${p(a)}·${p(x[j])}`).join(" + ")} = ${f(b[i])} ✓`),
      ],
    };
  },
};

export function generateExercise(topic: Topic, difficulty: 1 | 2 | 3): Exercise {
  return { topic, difficulty, ...generators[topic](difficulty) };
}

/** Difficulty grows with mastery: 1 until 3 correct, 2 until 8 correct, then 3. */
export function difficultyFor(correct: number): 1 | 2 | 3 {
  return correct >= 8 ? 3 : correct >= 3 ? 2 : 1;
}

export function pointsFor(difficulty: number, streak: number, hintUsed: boolean): number {
  const base = 10 * difficulty + Math.min(10, 2 * streak);
  return hintUsed ? Math.ceil(base / 2) : base;
}
