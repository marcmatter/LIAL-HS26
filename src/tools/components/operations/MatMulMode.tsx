"use client";

import { useEffect, useState } from "react";
import type { SceneObject } from "@/components/scene3d/Scene3D";
import { awardBadge } from "@/lib/game/progress";
import type { Matrix } from "@/lib/linalg/matrix";
import { column, matVec, to3, type Vec3 } from "@/lib/linalg/vector";
import Workspace from "./Workspace";
import { Card, Legend, MatrixEditor, Paren, SizeSelect, columnColors, fmt, paren, parseGrid, resize } from "./ui";

const mul = (a: Matrix, b: Matrix): Matrix => a.map((row) => b[0].map((_, k) => row.reduce((s, x, j) => s + x * b[j][k], 0)));
const same = (a: Matrix, b: Matrix) => a.length === b.length && a.every((row, i) => row.every((x, j) => Math.abs(x - b[i][j]) < 1e-9));
const sub = (n: number) => String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);
const str = (m: number[][]) => m.map((r) => r.map(String));

interface Preset {
  label: string;
  A: number[][];
  B: number[][];
  select?: [number, number];
}

const presets: Preset[] = [
  { label: "Folie 4: (3×4)·(4×2)", A: [[4, -2, -2, 0], [-2, -7, 3, 8], [0, 1, -2, -1]], B: [[4, -5], [3, -1], [6, 4], [0, -3]], select: [1, 0] },
  { label: "Folie 8: E·A", A: [[1, 0], [0, 1]], B: [[2, 3], [4, -5]] },
  { label: "Folie 15: P·A swaps rows", A: [[0, 1], [1, 0]], B: [[2, 3], [4, -5]] },
  { label: "Folie 15: A·P swaps columns", A: [[2, 3], [4, -5]], B: [[0, 1], [1, 0]] },
  { label: "AB ≠ BA", A: [[1, 1], [0, 1]], B: [[2, 0], [0, 1]] },
  { label: "3D: rotate, then stretch", A: [[2, 0, 0], [0, 1, 0], [0, 0, 1]], B: [[0, -1, 0], [1, 0, 0], [0, 0, 1]] },
];

/** Faces of the unit square / cube mapped through `map`. */
function unitFaces(n: number, map: (v: number[]) => Vec3): Vec3[][] {
  if (n === 2) return [[[0, 0], [1, 0], [1, 1], [0, 1]].map(map)];
  const faces: number[][][] = [];
  for (let axis = 0; axis < 3; axis++)
    for (const side of [0, 1]) {
      const [u, v] = [0, 1, 2].filter((k) => k !== axis);
      const c = (a: number, b: number) => {
        const p = [0, 0, 0];
        p[axis] = side;
        p[u] = a;
        p[v] = b;
        return p;
      };
      faces.push([c(0, 0), c(1, 0), c(1, 1), c(0, 1)]);
    }
  return faces.map((f) => f.map(map));
}

export default function MatMulMode() {
  const [l, setL] = useState(3);
  const [m, setM] = useState(4);
  const [n, setN] = useState(2);
  const [A, setA] = useState(() => str(presets[0].A));
  const [B, setB] = useState(() => str(presets[0].B));
  const [sel, setSel] = useState<[number, number]>([1, 0]);
  const [compare, setCompare] = useState(false);

  function applyPreset(p: Preset) {
    setL(p.A.length);
    setM(p.A[0].length);
    setN(p.B[0].length);
    setA(str(p.A));
    setB(str(p.B));
    setSel(p.select ?? [0, 0]);
    setCompare(false);
  }

  function resizeTo(nl: number, nm: number, nn: number) {
    setL(nl);
    setM(nm);
    setN(nn);
    setA((x) => resize(x, nl, nm));
    setB((x) => resize(x, nm, nn));
    setSel(([i, k]) => [Math.min(i, nl - 1), Math.min(k, nn - 1)]);
  }

  const Am = parseGrid(A);
  const Bm = parseGrid(B);
  const C = Am && Bm ? mul(Am, Bm) : null;
  const [si, sk] = sel;
  const baDefined = n === l;
  const BA = compare && Am && Bm && baDefined ? mul(Bm, Am) : null;
  const commute = BA && C ? same(C, BA) : null;

  useEffect(() => {
    if (commute === false) awardBadge("order-matters");
  }, [commute]);

  // ---- 3D: for square 2×2 / 3×3 matrices, AB = "first B, then A" ----
  const square = l === m && m === n && l <= 3;
  const objects: SceneObject[] = [];
  if (square && Am && Bm && C) {
    unitFaces(n, (v) => to3(v)).forEach((f) => objects.push({ kind: "polygon", points: f, color: "var(--muted)", fillOpacity: 0, dashed: true }));
    unitFaces(n, (v) => to3(matVec(Bm, v))).forEach((f) => objects.push({ kind: "polygon", points: f, color: "var(--vec-b)", fillOpacity: 0.05, dashed: true }));
    unitFaces(n, (v) => to3(matVec(C, v))).forEach((f) => objects.push({ kind: "polygon", points: f, color: "var(--vec-res)", fillOpacity: 0.1 }));
    for (let j = 0; j < n; j++) objects.push({ kind: "arrow", to: to3(column(C, j)), color: columnColors[j], label: `ABe${sub(j + 1)}`, width: 2.5 });
  }

  const grid = (M: Matrix, tone: (i: number, j: number) => string, onClick?: (i: number, j: number) => void) => (
    <Paren>
      <span className="grid gap-0.5 font-mono text-sm" style={{ gridTemplateColumns: `repeat(${M[0].length}, auto)` }}>
        {M.map((row, i) =>
          row.map((x, j) =>
            onClick ? (
              <button
                key={`${i}-${j}`}
                type="button"
                aria-label={`c${i + 1}${j + 1} = ${fmt(x)}`}
                aria-pressed={i === si && j === sk}
                onClick={() => onClick(i, j)}
                className={`min-w-10 rounded px-1.5 py-1 text-center transition hover:ring-1 hover:ring-accent ${tone(i, j)}`}
              >
                {fmt(x)}
              </button>
            ) : (
              <span key={`${i}-${j}`} className={`min-w-10 rounded px-1.5 py-1 text-center ${tone(i, j)}`}>
                {fmt(x)}
              </span>
            ),
          ),
        )}
      </span>
    </Paren>
  );

  const content = (
    <>
      <Card
        title="Input"
        aside={
          <div className="flex flex-wrap gap-3">
            <SizeSelect label="A: rows l" value={l} onChange={(v) => resizeTo(v, m, n)} options={[1, 2, 3, 4]} />
            <SizeSelect label="columns m" value={m} onChange={(v) => resizeTo(l, v, n)} options={[1, 2, 3, 4]} />
            <SizeSelect label="B: columns n" value={n} onChange={(v) => resizeTo(l, m, v)} options={[1, 2, 3, 4]} />
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
        <div className="flex flex-wrap items-center gap-6">
          <MatrixEditor name="A" color="var(--vec-a)" values={A} onChange={setA} />
          <MatrixEditor name="B" color="var(--vec-b)" values={B} onChange={setB} />
        </div>
        <p className="text-xs text-muted">
          A is ({l}×{m}), B is ({m}×{n}): the number of columns of A must equal the number of rows of B. AB is ({l}×{n}).
        </p>
      </Card>

      <Card title="Computation">
        {!Am || !Bm || !C ? (
          <p className="text-sm text-danger">Please correct the highlighted entries.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">Click an entry of AB to see how it is computed.</p>
            <div className="flex flex-wrap items-center gap-2">
              {grid(Am, (i) => (i === si ? "bg-vec-a/20 font-semibold" : ""))}
              <span className="text-muted">·</span>
              {grid(Bm, (_, j) => (j === sk ? "bg-vec-b/20 font-semibold" : ""))}
              <span className="text-muted">=</span>
              {grid(C, (i, j) => (i === si && j === sk ? "bg-accent/25 font-semibold ring-1 ring-accent" : ""), (i, j) => setSel([i, j]))}
            </div>
            <p className="font-mono text-sm">
              c{sub(si + 1)}
              {sub(sk + 1)} = Σ a{sub(si + 1)}ⱼ·bⱼ{sub(sk + 1)} ={" "}
              {Am[si].map((a, j) => `${paren(a)}·${paren(Bm[j][sk])}`).join(" + ")} ={" "}
              <strong className="text-accent">{fmt(C[si][sk])}</strong>
            </p>
            <p className="text-sm text-muted">
              Entry (i, k) of AB is the dot product of <span className="text-vec-a">row i of A</span> with{" "}
              <span className="text-vec-b">column k of B</span>.
            </p>

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <button
                type="button"
                className="self-start rounded-md border border-border px-3 py-1.5 text-sm transition hover:border-accent"
                aria-expanded={compare}
                onClick={() => setCompare(!compare)}
              >
                {compare ? "Hide B·A" : "Compare with B·A"}
              </button>
              {compare &&
                (!baDefined ? (
                  <p className="text-sm">
                    B·A is not even defined: B has {n} columns, A has {l} rows.
                  </p>
                ) : (
                  BA && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif italic">BA =</span>
                      {grid(BA, () => "")}
                      <span className={`rounded-full px-3 py-1 text-sm font-medium ${commute ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                        {commute ? "Here AB = BA — an exception!" : "AB ≠ BA — the order matters."}
                      </span>
                    </div>
                  )
                ))}
            </div>
          </div>
        )}
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>In general AB ≠ BA, but the product is associative: (AB)C = A(BC).</li>
          <li>As transformations, AB means: first apply B, then A.</li>
          <li>E·A = A·E = A (identity); P·A swaps rows, A·P swaps columns.</li>
        </ul>
      </Card>
    </>
  );

  if (!square) {
    return (
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex min-w-0 flex-col gap-6">{content}</div>
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted">
          The 3D picture is shown for square 2×2 or 3×3 matrices: there AB can be seen as a transformation — first B, then A.
          Try the presets “AB ≠ BA” or “3D: rotate, then stretch”.
        </p>
      </div>
    );
  }

  return (
    <Workspace
      key={n}
      defaultView={n === 3 ? "3d" : "2d"}
      objects={objects}
      legend={
        <Legend
          items={[
            { color: "var(--muted)", label: n === 3 ? "unit cube" : "unit square", dashed: true },
            { color: "var(--vec-b)", label: "after B", dashed: true },
            { color: "var(--vec-res)", label: "after B, then A = AB" },
          ]}
        />
      }
    >
      {content}
    </Workspace>
  );
}
