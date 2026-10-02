"use client";

import { useState } from "react";
import type { SceneObject } from "@/components/scene3d/Scene3D";
import type { Matrix } from "@/lib/linalg/matrix";
import { column, matAdd, matScale, matSub, scale, to3 } from "@/lib/linalg/vector";
import Workspace from "./Workspace";
import {
  Card,
  Equation,
  Legend,
  MatrixEditor,
  MatrixView,
  NumberField,
  Segmented,
  SizeSelect,
  Sym,
  columnColors,
  fmt,
  paren,
  parseGrid,
  parseNum,
  resize,
} from "./ui";
import { L, tr, useLang, useT, type L10n } from "@/lib/i18n/lang";

type MatOp = "add" | "sub" | "scale";

interface Preset {
  label: string;
  A: number[][];
  B?: number[][];
  op: MatOp;
  lambda?: string;
}

const presets: Preset[] = [
  { label: "Folie 25: A + B", A: [[1, 2], [3, 1]], B: [[-2, 1], [2, -4]], op: "add" },
  { label: "Folie 27a: 3·A", A: [[1, 2], [3, 1]], op: "scale", lambda: "3" },
  { label: "Folie 27b: (−1)·A", A: [[1, 2], [3, 1]], op: "scale", lambda: "-1" },
  { label: "3D: A − B", A: [[1, 0, 2], [0, 2, 1], [1, 1, 0]], B: [[0, 1, 1], [1, 0, -1], [2, 0, 1]], op: "sub" },
];

const str = (m: number[][]) => m.map((r) => r.map(String));

const facts: Record<MatOp, L10n[]> = {
  add: [
    L(
      "Entries in the same position (row, column) are added — both matrices must have the same size.",
      "Einträge an derselben Stelle (Zeile, Spalte) werden addiert — beide Matrizen müssen gleich gross sein.",
    ),
    L(
      "Column by column this is ordinary vector addition, as the picture shows.",
      "Spaltenweise ist das gewöhnliche Vektoraddition, wie das Bild zeigt.",
    ),
    L(
      "A + B = B + A (commutative) and (A + B) + C = A + (B + C) (associative); the zero matrix is the neutral element.",
      "A + B = B + A (kommutativ) und (A + B) + C = A + (B + C) (assoziativ); die Nullmatrix ist das neutrale Element.",
    ),
  ],
  sub: [
    L("A − B := A + (−1)·B: subtract entries in the same position.", "A − B := A + (−1)·B: Einträge an derselben Stelle subtrahieren."),
    L(
      "Each column of A − B is the vector from the tip of a column of B to the tip of the matching column of A.",
      "Jede Spalte von A − B ist der Vektor von der Spitze einer Spalte von B zur Spitze der passenden Spalte von A.",
    ),
    L("−A is the inverse of A with respect to addition: A + (−A) = 0.", "−A ist das Inverse von A bezüglich der Addition: A + (−A) = 0."),
  ],
  scale: [
    L("λ·A multiplies every entry of A by λ.", "λ·A multipliziert jeden Eintrag von A mit λ."),
    L(
      "Every column is scaled by λ: |λ| > 1 stretches, |λ| < 1 shrinks, λ < 0 reverses the direction.",
      "Jede Spalte wird mit λ skaliert: |λ| > 1 verlängert, |λ| < 1 verkürzt, λ < 0 kehrt die Richtung um.",
    ),
  ],
};

export default function MatOpsMode() {
  const [rows, setRows] = useState(2);
  const lang = useLang();
  const t = useT();
  const [cols, setCols] = useState(2);
  const [A, setA] = useState(() => str(presets[0].A));
  const [B, setB] = useState(() => str(presets[0].B!));
  const [lambda, setLambda] = useState("3");
  const [op, setOp] = useState<MatOp>("add");

  function applyPreset(p: Preset) {
    setRows(p.A.length);
    setCols(p.A[0].length);
    setA(str(p.A));
    setB(p.B ? str(p.B) : resize([], p.A.length, p.A[0].length));
    setOp(p.op);
    if (p.lambda) setLambda(p.lambda);
  }

  function resizeTo(r: number, c: number) {
    setRows(r);
    setCols(c);
    setA((m) => resize(m, r, c));
    setB((m) => resize(m, r, c));
  }

  const Am = parseGrid(A);
  const Bm = parseGrid(B);
  const l = parseNum(lambda);
  const valid = Am !== null && (op === "scale" ? l !== null : Bm !== null);

  let result: Matrix | null = null;
  let middle: string[][] = [];
  if (valid) {
    if (op === "scale" && l !== null) {
      result = matScale(l, Am);
      middle = Am.map((row) => row.map((a) => `${paren(l)}·${paren(a)}`));
    } else if (Bm) {
      result = op === "add" ? matAdd(Am, Bm) : matSub(Am, Bm);
      const s = op === "add" ? "+" : "−";
      middle = Am.map((row, i) => row.map((a, j) => `${fmt(a)} ${s} ${paren(Bm[i][j])}`));
    }
  }

  // ---- scene: the columns of the matrices as vectors ----
  const objects: SceneObject[] = [];
  if (valid && result && Am) {
    for (let j = 0; j < cols; j++) {
      const a = to3(column(Am, j));
      const r = to3(column(result, j));
      const color = columnColors[j];
      if (op === "scale") {
        objects.push({ kind: "arrow", to: a, color, width: 5, opacity: 0.3, label: `a${j + 1}` });
      } else {
        objects.push({ kind: "arrow", to: a, color, width: 1.8, opacity: 0.8, label: `a${j + 1}` });
        const b = to3(op === "add" ? column(Bm!, j) : scale(-1, column(Bm!, j)));
        objects.push({ kind: "arrow", from: a, to: r, color, dashed: true, width: 1.8, label: op === "add" ? `b${j + 1}` : `−b${j + 1}`, labelAt: "mid" });
        objects.push({ kind: "arrow", to: b, color, width: 1, opacity: 0.35 });
      }
      objects.push({ kind: "arrow", to: r, color: "var(--vec-res)", width: 3.5, label: `c${j + 1}` });
    }
  }

  const resultName = op === "add" ? "A + B" : op === "sub" ? "A − B" : `${paren(l ?? 0)}·A`;

  const legend = (
    <Legend
      items={[
        { color: "var(--foreground)", label: t("aⱼ: columns of A (coloured by column)", "aⱼ: Spalten von A (nach Spalte gefärbt)") },
        ...(op === "scale" ? [] : [{ color: "var(--foreground)", label: op === "add" ? t("bⱼ attached at the tip", "bⱼ an der Spitze angehängt") : t("−bⱼ attached at the tip", "−bⱼ an der Spitze angehängt"), dashed: true }]),
        { color: "var(--vec-res)", label: t(`cⱼ: columns of ${resultName}`, `cⱼ: Spalten von ${resultName}`) },
      ]}
    />
  );

  return (
    <Workspace key={rows} defaultView={rows === 3 ? "3d" : "2d"} objects={objects} legend={legend}>
      <Card
        title={t("Input", "Eingabe")}
        aside={
          <div className="flex gap-3">
            <SizeSelect label={t("Rows m", "Zeilen m")} value={rows} onChange={(r) => resizeTo(r, cols)} />
            <SizeSelect label={t("Columns n", "Spalten n")} value={cols} onChange={(c) => resizeTo(rows, c)} options={[1, 2, 3]} />
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              className="rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:border-accent hover:text-foreground"
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Segmented
          label={t("Operation", "Operation")}
          value={op}
          onChange={setOp}
          options={[
            { value: "add", label: "A + B" },
            { value: "sub", label: "A − B" },
            { value: "scale", label: "λ · A" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-6">
          <MatrixEditor name="A" values={A} onChange={setA} colorColumns />
          {op === "scale" ? (
            <NumberField name="λ" value={lambda} onChange={setLambda} />
          ) : (
            <MatrixEditor name="B" values={B} onChange={setB} colorColumns />
          )}
        </div>
      </Card>

      <Card title={t("Computation", "Rechnung")}>
        {!valid || !result ? (
          <p className="text-sm text-danger">{t("Please correct the highlighted entries.", "Bitte korrigiere die markierten Einträge.")}</p>
        ) : (
          <Equation>
            <span className="font-mono text-sm">{resultName}</span>
            <Sym>=</Sym>
            <MatrixView cells={middle} />
            <Sym>=</Sym>
            <MatrixView cells={result} color="var(--vec-res)" highlight />
          </Equation>
        )}
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          {facts[op].map((f) => (
            <li key={f.en}>{tr(lang, f)}</li>
          ))}
        </ul>
      </Card>
    </Workspace>
  );
}
