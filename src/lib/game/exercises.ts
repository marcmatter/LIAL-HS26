import { fromNumbers, inverseF } from "../linalg/fracMatrix";
import { determinant, formatNumber, type Matrix } from "../linalg/matrix";
import { add, dot, matVec, scale, sub } from "../linalg/vector";
import type { Topic } from "./progress";
import { L as tx, type L10n } from "../i18n/text";

/** A given quantity: a vector/matrix (as rows) or a scalar. */
export interface Given {
  label: string;
  value: Matrix | number;
  color?: "a" | "b";
}

export interface Exercise {
  topic: Topic;
  difficulty: 1 | 2 | 3;
  task: L10n;
  given: Given[];
  /** Expected answer as rows; a scalar answer is [[x]]. */
  answer: Matrix;
  answerLabel: string;
  hint: L10n;
  solution: L10n[];
}

/** Text that is the same in both languages (pure formulas). */
const same = (x: string) => tx(x, x);

export interface TopicInfo {
  id: Topic;
  icon: string;
  title: L10n;
  description: L10n;
}

export const topics: TopicInfo[] = [
  { id: "vec-add", icon: "➕", title: tx("Vector addition", "Vektoraddition"), description: tx("a + b and a − b, component by component.", "a + b und a − b, komponentenweise.") },
  { id: "vec-comb", icon: "🧮", title: tx("Linear combinations", "Linearkombinationen"), description: same("λ·a, λ·a + μ·b") },
  { id: "dot", icon: "•", title: tx("Dot product", "Skalarprodukt"), description: tx("a • b — and spotting orthogonal vectors.", "a • b — und orthogonale Vektoren erkennen.") },
  { id: "length", icon: "📏", title: tx("Length of a vector", "Länge eines Vektors"), description: same("|a| = √(a • a)") },
  { id: "mat-add", icon: "▦", title: tx("Matrix addition", "Matrixaddition"), description: tx("A + B, A − B and λ·A.", "A + B, A − B und λ·A.") },
  { id: "mat-vec", icon: "✖️", title: tx("Matrix × vector", "Matrix × Vektor"), description: tx("Ax, row by row.", "Ax, Zeile für Zeile.") },
  { id: "det", icon: "🔳", title: tx("Determinant", "Determinante"), description: tx("2×2 and 3×3 determinants.", "2×2- und 3×3-Determinanten.") },
  { id: "system", icon: "🧩", title: tx("Linear systems", "Lineare Gleichungssysteme"), description: tx("Solve Ax = b.", "Löse Ax = b.") },
  { id: "mat-mul", icon: "✴️", title: tx("Matrix multiplication", "Matrixmultiplikation"), description: tx("AB: row of A times column of B.", "AB: Zeile von A mal Spalte von B.") },
  { id: "transpose", icon: "🔄", title: tx("Transpose", "Transponieren"), description: tx("Aᵀ: rows become columns.", "Aᵀ: Zeilen werden zu Spalten.") },
  { id: "inverse", icon: "🔁", title: tx("Inverse matrix", "Inverse Matrix"), description: tx("A⁻¹ with A·A⁻¹ = E.", "A⁻¹ mit A·A⁻¹ = E.") },
  { id: "lu", icon: "🧱", title: tx("LU decomposition", "LR-Zerlegung"), description: tx("Find L or U with A = LU.", "Bestimme L oder U mit A = LU.") },
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
      task: tx(`Compute a ${op} b.`, `Berechne a ${op} b.`),
      given: [
        { label: "a", value: col(a), color: "a" },
        { label: "b", value: col(b), color: "b" },
      ],
      answer: col(res),
      answerLabel: `a ${op} b`,
      hint: tx(
        `Work component by component: the first component is a₁ ${op} b₁ = ${f(a[0])} ${op} ${p(b[0])}.`,
        `Rechne komponentenweise: die erste Komponente ist a₁ ${op} b₁ = ${f(a[0])} ${op} ${p(b[0])}.`,
      ),
      solution: a.map((x, i) =>
        tx(`component ${i + 1}: ${f(x)} ${op} ${p(b[i])} = ${f(res[i])}`, `Komponente ${i + 1}: ${f(x)} ${op} ${p(b[i])} = ${f(res[i])}`),
      ),
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
        task: tx("Compute λ·a.", "Berechne λ·a."),
        given: [
          { label: "λ", value: l },
          { label: "a", value: col(a), color: "a" },
        ],
        answer: col(res),
        answerLabel: "λ·a",
        hint: tx("Multiply every component of a by λ.", "Multipliziere jede Komponente von a mit λ."),
        solution: a.map((x, i) => tx(`component ${i + 1}: ${p(l)} · ${p(x)} = ${f(res[i])}`, `Komponente ${i + 1}: ${p(l)} · ${p(x)} = ${f(res[i])}`)),
      };
    }
    const m = randNonZero(-4, 4);
    const res = add(scale(l, a), scale(m, b));
    return {
      task: tx("Compute the linear combination λ·a + μ·b.", "Berechne die Linearkombination λ·a + μ·b."),
      given: [
        { label: "λ", value: l },
        { label: "μ", value: m },
        { label: "a", value: col(a), color: "a" },
        { label: "b", value: col(b), color: "b" },
      ],
      answer: col(res),
      answerLabel: "λa + μb",
      hint: tx("Scale first (λ·a and μ·b), then add component by component.", "Zuerst skalieren (λ·a und μ·b), dann komponentenweise addieren."),
      solution: [
        same(`λ·a = ${vecStr(scale(l, a))},  μ·b = ${vecStr(scale(m, b))}`),
        ...a.map((x, i) => {
          const calc = `${p(l)}·${p(x)} + ${p(m)}·${p(b[i])} = ${f(res[i])}`;
          return tx(`component ${i + 1}: ${calc}`, `Komponente ${i + 1}: ${calc}`);
        }),
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
      task: tx("Compute the dot product a • b. Are a and b orthogonal?", "Berechne das Skalarprodukt a • b. Sind a und b orthogonal?"),
      given: [
        { label: "a", value: col(a), color: "a" },
        { label: "b", value: col(b), color: "b" },
      ],
      answer: [[res]],
      answerLabel: "a • b",
      hint: tx(
        `a • b = a₁b₁ + a₂b₂${n === 3 ? " + a₃b₃" : ""}. It is 0 exactly when a ⊥ b.`,
        `a • b = a₁b₁ + a₂b₂${n === 3 ? " + a₃b₃" : ""}. Es ist genau dann 0, wenn a ⊥ b.`,
      ),
      solution: [
        same(`a • b = ${a.map((x, i) => `${p(x)}·${p(b[i])}`).join(" + ")} = ${f(res)}`),
        res === 0
          ? tx("a • b = 0, so a and b are orthogonal (a ⊥ b).", "a • b = 0, also sind a und b orthogonal (a ⊥ b).")
          : tx("a • b ≠ 0, so a and b are not orthogonal.", "a • b ≠ 0, also sind a und b nicht orthogonal."),
      ],
    };
  },

  length: (d) => {
    const base = d === 1 ? pick([[3, 4], [6, 8], [5, 12], [8, 15]]) : pick([[1, 2, 2], [2, 3, 6], [1, 4, 8], [4, 4, 7], [2, 6, 9], [2, 10, 11]]);
    const k = d === 3 ? rand(1, 3) : 1;
    const a = [...base].sort(() => Math.random() - 0.5).map((x) => x * k * (Math.random() < 0.5 ? -1 : 1));
    const len = Math.sqrt(dot(a, a));
    return {
      task: tx("Compute the length |a|.", "Berechne die Länge |a|."),
      given: [{ label: "a", value: col(a), color: "a" }],
      answer: [[len]],
      answerLabel: "|a|",
      hint: tx(
        "|a| = √(a • a) = √(a₁² + a₂² …) — square each component, add, take the square root.",
        "|a| = √(a • a) = √(a₁² + a₂² …) — jede Komponente quadrieren, addieren, Wurzel ziehen.",
      ),
      solution: [same(`|a| = √(${a.map((x) => `${p(x)}²`).join(" + ")}) = √${f(dot(a, a))} = ${f(len)}`)],
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
        task: tx("Compute λ·A.", "Berechne λ·A."),
        given: [
          { label: "λ", value: l },
          { label: "A", value: A },
        ],
        answer: res,
        answerLabel: "λ·A",
        hint: tx("Multiply every entry of A by λ.", "Multipliziere jeden Eintrag von A mit λ."),
        solution: [
          tx(
            `entry (1,1): ${p(l)} · ${p(A[0][0])} = ${f(res[0][0])} — and the same for every other entry.`,
            `Eintrag (1,1): ${p(l)} · ${p(A[0][0])} = ${f(res[0][0])} — und genauso für alle anderen Einträge.`,
          ),
        ],
      };
    }
    const res = A.map((row, i) => (op === "+" ? add(row, B[i]) : sub(row, B[i])));
    return {
      task: tx(`Compute A ${op} B.`, `Berechne A ${op} B.`),
      given: [
        { label: "A", value: A },
        { label: "B", value: B },
      ],
      answer: res,
      answerLabel: `A ${op} B`,
      hint: tx(
        `Combine the entries in the same position: entry (1,1) is ${f(A[0][0])} ${op} ${p(B[0][0])}.`,
        `Verknüpfe die Einträge an derselben Stelle: Eintrag (1,1) ist ${f(A[0][0])} ${op} ${p(B[0][0])}.`,
      ),
      solution: res.map((row, i) => {
        const calc = row.map((x, j) => `${f(A[i][j])} ${op} ${p(B[i][j])} = ${f(x)}`).join(",  ");
        return tx(`row ${i + 1}: ${calc}`, `Zeile ${i + 1}: ${calc}`);
      }),
    };
  },

  "mat-vec": (d) => {
    const [m, n] = d === 1 ? [2, 2] : d === 2 ? pick([[2, 3], [3, 2], [2, 2]]) : [3, 3];
    const r = d === 3 ? 6 : 4;
    const A = mat(m, n, r);
    const x = vec(n, r);
    const res = matVec(A, x);
    return {
      task: tx("Compute the matrix-vector product Ax.", "Berechne das Matrix-Vektor-Produkt Ax."),
      given: [
        { label: "A", value: A },
        { label: "x", value: col(x), color: "a" },
      ],
      answer: col(res),
      answerLabel: "Ax",
      hint: tx(
        `Entry i of Ax is (row i of A) • x. Entry 1: ${A[0].map((a, j) => `${p(a)}·${p(x[j])}`).join(" + ")}.`,
        `Eintrag i von Ax ist (Zeile i von A) • x. Eintrag 1: ${A[0].map((a, j) => `${p(a)}·${p(x[j])}`).join(" + ")}.`,
      ),
      solution: A.map((row, i) => {
        const calc = `${row.map((a, j) => `${p(a)}·${p(x[j])}`).join(" + ")} = ${f(res[i])}`;
        return tx(`entry ${i + 1}: ${calc}`, `Eintrag ${i + 1}: ${calc}`);
      }),
    };
  },

  det: (d) => {
    if (d === 1) {
      const A = mat(2, 2, 6);
      const res = determinant(A);
      return {
        task: tx("Compute the determinant det A.", "Berechne die Determinante det A."),
        given: [{ label: "A", value: A }],
        answer: [[res]],
        answerLabel: "det A",
        hint: tx(
          "For a 2×2 matrix: det A = a·d − b·c (main diagonal minus the other diagonal).",
          "Für eine 2×2-Matrix: det A = a·d − b·c (Hauptdiagonale minus Nebendiagonale).",
        ),
        solution: [same(`det A = ${p(A[0][0])}·${p(A[1][1])} − ${p(A[0][1])}·${p(A[1][0])} = ${f(res)}`)],
      };
    }
    const A = mat(3, 3, d === 2 ? 3 : 5);
    const res = Math.round(determinant(A));
    const minor = (j: number) => {
      const [c1, c2] = [0, 1, 2].filter((k) => k !== j);
      return A[1][c1] * A[2][c2] - A[1][c2] * A[2][c1];
    };
    return {
      task: tx("Compute the determinant det A.", "Berechne die Determinante det A."),
      given: [{ label: "A", value: A }],
      answer: [[res]],
      answerLabel: "det A",
      hint: tx(
        "Expand along the first row: det A = a₁₁·M₁₁ − a₁₂·M₁₂ + a₁₃·M₁₃, where M₁ⱼ is the 2×2 determinant left after deleting row 1 and column j (or use the rule of Sarrus).",
        "Entwickle nach der ersten Zeile: det A = a₁₁·M₁₁ − a₁₂·M₁₂ + a₁₃·M₁₃, wobei M₁ⱼ die 2×2-Determinante ohne Zeile 1 und Spalte j ist (oder Regel von Sarrus).",
      ),
      solution: [
        ...[0, 1, 2].map((j) => same(`M₁${sub_[j]} = ${f(minor(j))}`)),
        same(`det A = ${p(A[0][0])}·${p(minor(0))} − ${p(A[0][1])}·${p(minor(1))} + ${p(A[0][2])}·${p(minor(2))} = ${f(res)}`),
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
      task: tx(
        `Solve the linear system Ax = b for x = (${names.slice(0, n).join(", ")}).`,
        `Löse das Gleichungssystem Ax = b nach x = (${names.slice(0, n).join(", ")}).`,
      ),
      given: [
        { label: "A", value: A },
        { label: "b", value: col(b), color: "b" },
      ],
      answer: col(x),
      answerLabel: "x",
      hint: tx(
        "Row-reduce the augmented matrix (A | b) to reduced row echelon form — the last column is then the solution. The Gauss-Jordan tool helps.",
        "Bringe die erweiterte Matrix (A | b) auf reduzierte Zeilenstufenform — die letzte Spalte ist dann die Lösung. Das Gauss-Jordan-Werkzeug hilft.",
      ),
      solution: [
        same(`x = ${vecStr(x)}`),
        ...A.map((row, i) => {
          const calc = `${row.map((a, j) => `${p(a)}·${p(x[j])}`).join(" + ")} = ${f(b[i])} ✓`;
          return tx(`check row ${i + 1}: ${calc}`, `Probe Zeile ${i + 1}: ${calc}`);
        }),
      ],
    };
  },

  "mat-mul": (d) => {
    const [l, m, n] = d === 1 ? [2, 2, 2] : d === 2 ? pick([[2, 3, 2], [3, 2, 3], [2, 2, 3], [3, 2, 2]]) : [3, 3, 3];
    const r = d === 3 ? 4 : 3;
    // Sometimes an identity or permutation factor, to recognise E·A = A and P·A = row swap.
    let A = mat(l, m, r);
    if (d === 1 && Math.random() < 0.3) A = pick([[[1, 0], [0, 1]], [[0, 1], [1, 0]]]);
    const B = mat(m, n, r);
    const C = A.map((row) => B[0].map((_, k) => row.reduce((acc, x, j) => acc + x * B[j][k], 0)));
    return {
      task: tx("Compute the matrix product AB.", "Berechne das Matrixprodukt AB."),
      given: [
        { label: "A", value: A, color: "a" },
        { label: "B", value: B, color: "b" },
      ],
      answer: C,
      answerLabel: "AB",
      hint: tx(
        `Entry (i, k) of AB = (row i of A) • (column k of B). Entry (1,1): ${A[0].map((a, j) => `${p(a)}·${p(B[j][0])}`).join(" + ")}.`,
        `Eintrag (i, k) von AB = (Zeile i von A) • (Spalte k von B). Eintrag (1,1): ${A[0].map((a, j) => `${p(a)}·${p(B[j][0])}`).join(" + ")}.`,
      ),
      solution: C.flatMap((row, i) =>
        row.map((c, k) => same(`c${sub_[i]}${sub_[k]} = ${A[i].map((a, j) => `${p(a)}·${p(B[j][k])}`).join(" + ")} = ${f(c)}`)),
      ),
    };
  },

  transpose: (d) => {
    const [m, n] = d === 1 ? [2, 3] : d === 2 ? pick([[3, 2], [3, 4], [2, 4]]) : pick([[4, 3], [4, 4], [3, 4]]);
    const A = mat(m, n, 9);
    const T = A[0].map((_, j) => A.map((row) => row[j]));
    return {
      task: tx("Write down the transpose Aᵀ.", "Gib die Transponierte Aᵀ an."),
      given: [{ label: "A", value: A }],
      answer: T,
      answerLabel: "Aᵀ",
      hint: tx(
        `Mirror A at its main diagonal: row 1 of A (${A[0].map(f).join(", ")}) becomes column 1 of Aᵀ.`,
        `Spiegle A an der Hauptdiagonalen: Zeile 1 von A (${A[0].map(f).join(", ")}) wird Spalte 1 von Aᵀ.`,
      ),
      solution: A.map((row, i) =>
        tx(
          `row ${i + 1} of A = (${row.map(f).join(", ")}) → column ${i + 1} of Aᵀ`,
          `Zeile ${i + 1} von A = (${row.map(f).join(", ")}) → Spalte ${i + 1} von Aᵀ`,
        ),
      ),
    };
  },

  inverse: (d) => {
    let A: Matrix;
    if (d === 3) {
      // Product of integer elementary matrices: det = ±1, so A⁻¹ has integer entries.
      A = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      for (let k = 0; k < 4; k++) {
        const i = rand(0, 2);
        const j = (i + rand(1, 2)) % 3;
        const c = randNonZero(-2, 2);
        A[i] = A[i].map((x, col) => x + c * A[j][col]);
      }
    } else {
      const dets = d === 1 ? [1, -1] : [1, -1, 2, -2];
      do A = mat(2, 2, 5);
      while (!dets.includes(Math.round(determinant(A))));
    }
    const inv = inverseF(fromNumbers(A)).inverse!.map((row) => row.map((x) => x.toNumber()));
    const det = Math.round(determinant(A));
    const two = A.length === 2;
    return {
      task: tx("Compute the inverse matrix A⁻¹.", "Berechne die inverse Matrix A⁻¹."),
      given: [{ label: "A", value: A }],
      answer: inv,
      answerLabel: "A⁻¹",
      hint: two
        ? tx(
            "For A = (a b; c d): A⁻¹ = 1/(ad − bc) · (d −b; −c a). Fractions like 1/2 are fine.",
            "Für A = (a b; c d): A⁻¹ = 1/(ad − bc) · (d −b; −c a). Brüche wie 1/2 sind erlaubt.",
          )
        : tx(
            "Row-reduce [A | E] until the left half is E — the right half is then A⁻¹.",
            "Forme [A | E] um, bis links E steht — rechts steht dann A⁻¹.",
          ),
      solution: two
        ? [
            same(`ad − bc = ${p(A[0][0])}·${p(A[1][1])} − ${p(A[0][1])}·${p(A[1][0])} = ${f(det)}`),
            same(`A⁻¹ = 1/${p(det)} · (${f(A[1][1])}  ${f(-A[0][1])} ; ${f(-A[1][0])}  ${f(A[0][0])})`),
            tx("Check: A·A⁻¹ = E", "Probe: A·A⁻¹ = E"),
          ]
        : [
            tx(`det A = ${f(det)}, so A is invertible.`, `det A = ${f(det)}, also ist A invertierbar.`),
            tx("Gauss-Jordan on [A | E] gives [E | A⁻¹].", "Gauss-Jordan auf [A | E] ergibt [E | A⁻¹]."),
            tx("Check: A·A⁻¹ = E", "Probe: A·A⁻¹ = E"),
          ],
    };
  },

  lu: (d) => {
    const n = d === 1 ? 2 : 3;
    const L = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : j < i ? rand(-3, 3) : 0)));
    const U = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (j === i ? randNonZero(-4, 4) : j > i ? rand(-4, 4) : 0)));
    const A = L.map((row) => U[0].map((_, k) => row.reduce((acc, x, j) => acc + x * U[j][k], 0)));
    const askL = Math.random() < 0.5;
    const multipliers: string[] = [];
    for (let j = 0; j < n; j++) for (let i = j + 1; i < n; i++) multipliers.push(`l${sub_[i]}${sub_[j]} = ${f(L[i][j])}`);
    return {
      task: askL
        ? tx(
            "Find the lower triangular matrix L of the LU decomposition A = LU (no row swaps).",
            "Bestimme die untere Dreiecksmatrix L der LR-Zerlegung A = LU (ohne Zeilentausch).",
          )
        : tx(
            "Find the upper triangular matrix U of the LU decomposition A = LU (no row swaps).",
            "Bestimme die obere Dreiecksmatrix U der LR-Zerlegung A = LU (ohne Zeilentausch).",
          ),
      given: [{ label: "A", value: A }],
      answer: askL ? L : U,
      answerLabel: askL ? "L" : "U",
      hint: askL
        ? tx(
            `Eliminate below each pivot. The multiplier l_ij = (entry to eliminate) / (pivot) goes into row i, column j of L; the diagonal of L is 1. First: l₂₁ = ${f(A[1][0])} / ${p(A[0][0])}.`,
            `Eliminiere unterhalb jedes Pivots. Der Faktor l_ij = (zu eliminierender Eintrag) / (Pivot) kommt in Zeile i, Spalte j von L; die Diagonale von L ist 1. Zuerst: l₂₁ = ${f(A[1][0])} / ${p(A[0][0])}.`,
          )
        : tx(
            `Do Gaussian elimination without swaps — U is the resulting row echelon form. First step: row 2 − (${f(A[1][0])} / ${p(A[0][0])}) · row 1.`,
            `Führe die Gauss-Elimination ohne Zeilentausch durch — U ist die entstehende Zeilenstufenform. Erster Schritt: Zeile 2 − (${f(A[1][0])} / ${p(A[0][0])}) · Zeile 1.`,
          ),
      solution: [
        tx(`multipliers: ${multipliers.join(",  ")}`, `Faktoren: ${multipliers.join(",  ")}`),
        same(`U = (${U.map((row) => row.map(f).join("  ")).join(" ; ")})`),
        tx("Check: L·U = A", "Probe: L·U = A"),
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
