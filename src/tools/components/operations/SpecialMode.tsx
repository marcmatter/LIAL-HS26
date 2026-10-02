"use client";

import { useState, type ReactNode } from "react";
import FracMatrixView from "@/components/math/FracMatrixView";
import { awardBadge } from "@/lib/game/progress";
import { Fraction } from "@/lib/linalg/fraction";
import { identityF, inverseF, isIdentityF, mulF, permutationMatrix, transposeF } from "@/lib/linalg/fracMatrix";
import type { FracMatrix } from "@/lib/linalg/rowOps";
import { Card, MatrixEditor, Segmented, SizeSelect, columnColors, parseGrid, resize } from "./ui";
import { useT } from "@/lib/i18n/lang";

type Kind = "identity" | "transpose" | "inverse" | "permutation";

const toFrac = (m: number[][]): FracMatrix => m.map((r) => r.map((x) => Fraction.parse(String(x)) ?? Fraction.ZERO));
const str = (m: number[][]) => m.map((r) => r.map(String));
const sub = (n: number) => String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);

export default function SpecialMode() {
  const [kind, setKind] = useState<Kind>("identity");
  const t = useT();
  return (
    <div className="flex flex-col gap-6">
      <Segmented
        label={t("Matrix type", "Matrixtyp")}
        value={kind}
        onChange={setKind}
        options={[
          { value: "identity", label: t("Identity E", "Einheitsmatrix E") },
          { value: "transpose", label: t("Transpose Aᵀ", "Transponierte Aᵀ") },
          { value: "inverse", label: t("Inverse A⁻¹", "Inverse A⁻¹") },
          { value: "permutation", label: t("Permutation P", "Permutation P") },
        ]}
      />
      {kind === "identity" && <IdentityView />}
      {kind === "transpose" && <TransposeView />}
      {kind === "inverse" && <InverseView />}
      {kind === "permutation" && <PermutationView />}
    </div>
  );
}

function Theory({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm">{children}</div>;
}

// ---- Identity ------------------------------------------------------------------------

function IdentityView() {
  const [A, setA] = useState(() => str([[2, 3], [4, -5]]));
  const t = useT();
  const n = A.length;
  const Am = parseGrid(A);
  const E = identityF(n);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title={t("Identity matrix", "Einheitsmatrix")} aside={<SizeSelect label="n" value={n} onChange={(k) => setA((a) => resize(a, k, k))} options={[2, 3, 4]} />}>
        <Theory>
          {t(
            <>
              E<sub>n</sub> (also I<sub>n</sub>) is square with ones on the main diagonal and zeros elsewhere. It is the neutral
              element of matrix multiplication: <strong>E·A = A·E = A</strong> — like the number 1 for real numbers.
            </>,
            <>
              E<sub>n</sub> (auch I<sub>n</sub>) ist quadratisch mit Einsen auf der Hauptdiagonalen und Nullen sonst. Sie ist das
              neutrale Element der Matrixmultiplikation: <strong>E·A = A·E = A</strong> — wie die Zahl 1 bei reellen Zahlen.
            </>,
          )}
        </Theory>
        <FracMatrixView m={E} label={<>E{sub(n)}</>} tone={(i, j) => (i === j ? "accent" : undefined)} />
      </Card>
      <Card title={t("Try it (Folie 8)", "Ausprobieren (Folie 8)")}>
        <MatrixEditor name="A" values={A} onChange={setA} />
        {Am ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <FracMatrixView m={E} label="E·A" />
              <span className="text-muted">·</span>
              <FracMatrixView m={toFrac(Am)} />
              <span className="text-muted">=</span>
              <FracMatrixView m={mulF(E, toFrac(Am))} tone={() => "success"} />
            </div>
            <p className="text-sm text-muted">{t("The result is A again, whichever side E is on.", "Das Ergebnis ist wieder A — egal, auf welcher Seite E steht.")}</p>
          </div>
        ) : (
          <p className="text-sm text-danger">{t("Please correct the highlighted entries.", "Bitte korrigiere die markierten Einträge.")}</p>
        )}
      </Card>
    </div>
  );
}

// ---- Transpose -------------------------------------------------------------------------

function TransposeView() {
  const [A, setA] = useState(() => str([[4, 5, 0], [-2, -2, 8], [-1, 4, 3], [7, 0, -6]]));
  const [hover, setHover] = useState<[number, number] | null>(null);
  const t = useT();
  const rows = A.length;
  const cols = A[0].length;
  const Am = parseGrid(A);
  const rowColors = [...columnColors, "var(--vec-a)"];

  const cell = (value: number, i: number, j: number, transposed: boolean) => {
    const [ri, rj] = transposed ? [j, i] : [i, j];
    const active = hover && hover[0] === ri && hover[1] === rj;
    return (
      <span
        key={`${i}-${j}`}
        onMouseEnter={() => setHover([ri, rj])}
        onMouseLeave={() => setHover(null)}
        className={`min-w-10 cursor-default rounded px-1.5 py-1 text-center font-mono text-sm ${active ? "bg-accent/25 ring-1 ring-accent" : ""}`}
        style={{ color: rowColors[ri] }}
      >
        {value}
      </span>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card
        title={t("Transpose (Folie 9)", "Transponierte (Folie 9)")}
        aside={
          <div className="flex gap-3">
            <SizeSelect label={t("rows", "Zeilen")} value={rows} onChange={(r) => setA((a) => resize(a, r, cols))} options={[1, 2, 3, 4]} />
            <SizeSelect label={t("columns", "Spalten")} value={cols} onChange={(c) => setA((a) => resize(a, rows, c))} options={[1, 2, 3, 4]} />
          </div>
        }
      >
        <MatrixEditor name="A" values={A} onChange={setA} />
        <Theory>
          {t(
            <>
              Aᵀ is A mirrored at its main diagonal: <strong>rows become columns</strong>. The entry in row i, column j of A lands
              in row j, column i of Aᵀ: (Aᵀ)<sub>ji</sub> = a<sub>ij</sub>. An (m×n)-matrix becomes an (n×m)-matrix.
            </>,
            <>
              Aᵀ ist A an der Hauptdiagonalen gespiegelt: <strong>Zeilen werden zu Spalten</strong>. Der Eintrag in Zeile i, Spalte
              j von A landet in Zeile j, Spalte i von Aᵀ: (Aᵀ)<sub>ji</sub> = a<sub>ij</sub>. Aus einer (m×n)- wird eine
              (n×m)-Matrix.
            </>,
          )}
        </Theory>
      </Card>
      <Card title={t("A and Aᵀ", "A und Aᵀ")}>
        {Am ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              {t(
                "Each row of A has its own colour — find it again as a column of Aᵀ. Hover an entry.",
                "Jede Zeile von A hat eine eigene Farbe — du findest sie als Spalte von Aᵀ wieder. Fahre über einen Eintrag.",
              )}
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <span className="inline-flex items-center gap-2">
                <span className="font-serif italic">A =</span>
                <span className="grid gap-0.5 rounded-lg border border-border p-1.5" style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}>
                  {Am.map((row, i) => row.map((x, j) => cell(x, i, j, false)))}
                </span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="font-serif italic">Aᵀ =</span>
                <span className="grid gap-0.5 rounded-lg border border-border p-1.5" style={{ gridTemplateColumns: `repeat(${rows}, auto)` }}>
                  {Am[0].map((_, j) => Am.map((row, i) => cell(row[j], j, i, true)))}
                </span>
              </span>
            </div>
            {hover && (
              <p className="font-mono text-sm">
                a{sub(hover[0] + 1)}
                {sub(hover[1] + 1)} = {Am[hover[0]][hover[1]]} → (Aᵀ){sub(hover[1] + 1)}
                {sub(hover[0] + 1)}
              </p>
            )}
            <Theory>
              {t(
                <>
                  Product rule: <strong>(A·B)ᵀ = Bᵀ·Aᵀ</strong> — transpose each factor and reverse the order.
                </>,
                <>
                  Produktregel: <strong>(A·B)ᵀ = Bᵀ·Aᵀ</strong> — jeden Faktor transponieren und die Reihenfolge umkehren.
                </>,
              )}
            </Theory>
          </div>
        ) : (
          <p className="text-sm text-danger">{t("Please correct the highlighted entries.", "Bitte korrigiere die markierten Einträge.")}</p>
        )}
      </Card>
    </div>
  );
}

// ---- Inverse ------------------------------------------------------------------------------

const inversePresets = [
  { label: "Folie 10: invertible / invertierbar", A: [[1, 3], [2, 7]] },
  { label: "Folie 12: singular / singulär", A: [[1, 3], [2, 6]] },
  { label: "3×3", A: [[2, 1, 0], [1, 1, 0], [0, 0, 3]] },
];

function InverseView() {
  const [A, setA] = useState(() => str(inversePresets[0].A));
  const [checked, setChecked] = useState(false);
  const t = useT();
  const n = A.length;
  const Am = parseGrid(A);
  const F = Am ? toFrac(Am) : null;
  const result = F ? inverseF(F) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title={t("Inverse matrix", "Inverse Matrix")} aside={<SizeSelect label="n" value={n} onChange={(k) => { setA((a) => resize(a, k, k)); setChecked(false); }} options={[2, 3, 4]} />}>
        <div className="flex flex-wrap gap-2">
          {inversePresets.map((p) => (
            <button
              key={p.label}
              type="button"
              className="rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:border-accent hover:text-foreground"
              onClick={() => {
                setA(str(p.A));
                setChecked(false);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <MatrixEditor name="A" values={A} onChange={(v) => { setA(v); setChecked(false); }} />
        <Theory>
          {t(
            <>
              A square matrix A is <strong>invertible</strong> (regular, non-singular) if there is a matrix A⁻¹ with{" "}
              <strong>A·A⁻¹ = A⁻¹·A = E</strong>. Otherwise it is <strong>singular</strong> — then some x ≠ 0 satisfies Ax = 0.
              For a 2×2 matrix: A⁻¹ = 1/(ad − bc) · (d −b; −c a). For products: (AB)⁻¹ = B⁻¹A⁻¹.
            </>,
            <>
              Eine quadratische Matrix A heisst <strong>invertierbar</strong> (regulär, nichtsingulär), wenn es eine Matrix A⁻¹ mit{" "}
              <strong>A·A⁻¹ = A⁻¹·A = E</strong> gibt. Sonst ist sie <strong>singulär</strong> — dann gibt es ein x ≠ 0 mit Ax =
              0. Für 2×2: A⁻¹ = 1/(ad − bc) · (d −b; −c a). Für Produkte: (AB)⁻¹ = B⁻¹A⁻¹.
            </>,
          )}
        </Theory>
      </Card>
      <Card title={t("Result", "Ergebnis")}>
        {!F || !result ? (
          <p className="text-sm text-danger">{t("Please correct the highlighted entries.", "Bitte korrigiere die markierten Einträge.")}</p>
        ) : result.inverse ? (
          <div className="flex flex-col gap-4">
            <FracMatrixView m={result.inverse} label="A⁻¹" tone={() => "accent"} />
            {n === 2 && (
              <p className="font-mono text-sm">
                ad − bc = {String(F[0][0])}·{String(F[1][1])} − {String(F[0][1])}·{String(F[1][0])} ={" "}
                {String(F[0][0].mul(F[1][1]).sub(F[0][1].mul(F[1][0])))}
              </p>
            )}
            <button
              type="button"
              className="self-start rounded-md border border-border px-3 py-1.5 text-sm transition hover:border-accent"
              onClick={() => {
                setChecked(true);
                awardBadge("inverter");
              }}
            >
              {t("Check: A · A⁻¹ = ?", "Probe: A · A⁻¹ = ?")}
            </button>
            {checked && (
              <div className="flex flex-wrap items-center gap-2">
                <FracMatrixView m={F} />
                <span className="text-muted">·</span>
                <FracMatrixView m={result.inverse} />
                <span className="text-muted">=</span>
                <FracMatrixView m={mulF(F, result.inverse)} tone={(i, j) => (i === j ? "success" : undefined)} />
                <span className="text-sm text-success">{isIdentityF(mulF(F, result.inverse)) ? "= E ✓" : ""}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <p className="rounded-lg bg-danger/10 px-3 py-2 font-medium text-danger">{t("A is singular — there is no inverse.", "A ist singulär — es gibt keine Inverse.")}</p>
            {result.nullVector && (
              <div className="flex flex-wrap items-center gap-2">
                <span>{t("Reason: for", "Grund: für")}</span>
                <FracMatrixView m={result.nullVector.map((x) => [x])} label="x" tone={() => "danger"} />
                <span>{t("we get", "gilt")}</span>
                <FracMatrixView m={mulF(F, result.nullVector.map((x) => [x]))} label="Ax" />
                <span>
                  {t(
                    ". A sends a non-zero vector to 0, so no matrix can undo A (Folie 12).",
                    ". A bildet einen Vektor ≠ 0 auf 0 ab, also kann keine Matrix A rückgängig machen (Folie 12).",
                  )}
                </span>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---- Permutation ---------------------------------------------------------------------------

function PermutationView() {
  const [order, setOrder] = useState([2, 1, 0]);
  const t = useT();
  const [A, setA] = useState(() => str([[1, 3, -4], [2, -6, 0], [-8, -7, 11]]));
  const n = order.length;
  const P = permutationMatrix(order);
  const Am = parseGrid(A);
  const F = Am ? toFrac(Am) : null;

  function setSize(k: number) {
    setOrder(Array.from({ length: k }, (_, i) => i));
    setA((a) => resize(a, k, k));
  }
  function swap(i: number, j: number) {
    setOrder((o) => o.map((x, k) => (k === i ? o[j] : k === j ? o[i] : x)));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title={t("Permutation matrix", "Permutationsmatrix")} aside={<SizeSelect label="n" value={n} onChange={setSize} options={[2, 3, 4]} />}>
        <Theory>
          {t(
            <>
              A permutation matrix P has exactly one 1 in every row and every column, zeros elsewhere — it is the identity with
              its rows reordered. <strong>P·A</strong> reorders the <strong>rows</strong> of A, <strong>A·P</strong> reorders the{" "}
              <strong>columns</strong>.
            </>,
            <>
              Eine Permutationsmatrix P hat in jeder Zeile und jeder Spalte genau eine 1, sonst Nullen — sie ist die
              Einheitsmatrix mit umgeordneten Zeilen. <strong>P·A</strong> vertauscht die <strong>Zeilen</strong> von A,{" "}
              <strong>A·P</strong> die <strong>Spalten</strong>.
            </>,
          )}
        </Theory>
        <p className="text-sm text-muted">{t("Swap two rows of E to build P:", "Vertausche zwei Zeilen von E, um P zu bilden:")}</p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (_, j) =>
              j > i ? (
                <button
                  key={`${i}-${j}`}
                  type="button"
                  className="rounded-md border border-border px-2.5 py-1 text-sm transition hover:border-accent"
                  onClick={() => swap(i, j)}
                >
                  {t("swap", "tausche")} {i + 1} ↔ {j + 1}
                </button>
              ) : null,
            ),
          )}
          <button type="button" className="rounded-md px-2.5 py-1 text-sm text-muted hover:text-foreground" onClick={() => setOrder(order.map((_, i) => i))}>
            {t("reset", "zurücksetzen")}
          </button>
        </div>
        <FracMatrixView m={P} label="P" tone={(i, j) => (P[i][j].isOne() ? (i === j ? "muted" : "accent") : undefined)} />
        <MatrixEditor name="A" values={A} onChange={setA} />
      </Card>
      <Card title={t("P·A and A·P (Folie 15/16)", "P·A und A·P (Folie 15/16)")}>
        {F ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <FracMatrixView m={mulF(P, F)} label="P·A" tone={(i) => (order[i] !== i ? "row" : undefined)} />
              <span className="text-sm text-muted">{t("rows reordered", "Zeilen umgeordnet")}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FracMatrixView m={mulF(F, P)} label="A·P" tone={(_, j) => (order.indexOf(j) !== j ? "col" : undefined)} />
              <span className="text-sm text-muted">{t("columns reordered", "Spalten umgeordnet")}</span>
            </div>
            <p className="text-sm text-muted">
              {t(
                "Folie 16 asks to swap column 3 with column 1: build P with “swap 1 ↔ 3” and look at A·P. Useful fact: Pᵀ = P⁻¹, e.g. ",
                "Folie 16 verlangt, Spalte 3 mit Spalte 1 zu tauschen: bilde P mit „tausche 1 ↔ 3“ und betrachte A·P. Nützlich: Pᵀ = P⁻¹, z. B. ",
              )}
              <span className="font-mono">Pᵀ·P = E</span> {isIdentityF(mulF(transposeF(P), P)) ? "✓" : ""}.
            </p>
          </div>
        ) : (
          <p className="text-sm text-danger">{t("Please correct the highlighted entries.", "Bitte korrigiere die markierten Einträge.")}</p>
        )}
      </Card>
    </div>
  );
}
