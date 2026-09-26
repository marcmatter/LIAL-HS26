"use client";

import { useEffect, useRef, useState } from "react";
import type { SceneObject } from "@/components/scene3d/Scene3D";
import { awardBadge } from "@/lib/game/progress";
import { determinant, type Matrix } from "@/lib/linalg/matrix";
import { column, lerpFromIdentity, matVec, scale, to3, add, type Vec3 } from "@/lib/linalg/vector";
import Workspace from "./Workspace";
import {
  Card,
  Equation,
  Legend,
  MatrixEditor,
  MatrixView,
  Segmented,
  SizeSelect,
  Sym,
  asColumn,
  columnColors,
  fmt,
  paren,
  parseGrid,
  resize,
} from "./ui";

type Picture = "columns" | "transform";

interface Preset {
  label: string;
  A: (number | string)[][];
  x: (number | string)[];
  picture?: Picture;
}

const s45 = "0.7071";

const presets: Preset[] = [
  { label: "Folie 31: Ax = b", A: [[1, 2, 4], [3, 1, -1]], x: ["-3/5", "4/5", 0], picture: "columns" },
  { label: "Stretch (2D)", A: [[2, 0], [0, 1]], x: [1, 2], picture: "transform" },
  { label: "Rotation 45° (2D)", A: [[s45, `-${s45}`], [s45, s45]], x: [2, 1], picture: "transform" },
  { label: "Shear", A: [[1, 1, 0], [0, 1, 0], [0, 0, 1]], x: [1, 2, 1], picture: "transform" },
  { label: "Rotation 90° about z", A: [[0, -1, 0], [1, 0, 0], [0, 0, 1]], x: [2, 1, 1], picture: "transform" },
  { label: "Scaling", A: [[2, 0, 0], [0, 0.5, 0], [0, 0, 1.5]], x: [1, 1, 1], picture: "transform" },
  { label: "Reflection at xy-plane", A: [[1, 0, 0], [0, 1, 0], [0, 0, -1]], x: [1, 2, 2], picture: "transform" },
  { label: "Projection onto xy-plane", A: [[1, 0, 0], [0, 1, 0], [0, 0, 0]], x: [1, 2, 2], picture: "transform" },
];

const str = (v: (number | string)[][]) => v.map((row) => row.map(String));

/** Faces of the unit square / cube spanned by the basis vectors, mapped through `map`. */
function unitShapeFaces(n: number, map: (v: number[]) => Vec3): Vec3[][] {
  if (n === 2) return [[[0, 0], [1, 0], [1, 1], [0, 1]].map(map)];
  const faces: number[][][] = [];
  for (let axis = 0; axis < 3; axis++) {
    for (const side of [0, 1]) {
      const [u, v] = [0, 1, 2].filter((k) => k !== axis);
      const corner = (a: number, b: number) => {
        const p = [0, 0, 0];
        p[axis] = side;
        p[u] = a;
        p[v] = b;
        return p;
      };
      faces.push([corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)]);
    }
  }
  return faces.map((f) => f.map(map));
}

const sub = ["₁", "₂", "₃"];

export default function MatVecMode() {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(3);
  const [A, setA] = useState(() => str(presets[0].A));
  const [x, setX] = useState(() => str(presets[0].x.map((v) => [v])));
  const [picture, setPicture] = useState<Picture>("columns");
  const [t, setT] = useState(1);
  const [playing, setPlaying] = useState(false);
  const frame = useRef<number | null>(null);

  function applyPreset(p: Preset) {
    setRows(p.A.length);
    setCols(p.A[0].length);
    setA(str(p.A));
    setX(str(p.x.map((v) => [v])));
    if (p.picture) setPicture(p.picture);
    setT(1);
  }

  function resizeTo(r: number, c: number) {
    setRows(r);
    setCols(c);
    setA((m) => resize(m, r, c));
    setX((v) => resize(v, c, 1));
  }

  // Animate t from 0 to 1 ("identity" → A).
  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1800);
      setT(p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
      if (p < 1) frame.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [playing]);

  const Am = parseGrid(A);
  const xv = parseGrid(x)?.map((r) => r[0]);
  const valid = Am !== null && xv !== undefined;
  const Ax = valid ? matVec(Am, xv) : null;
  const square = rows === cols;
  // The column picture lives in ℝᵐ (the output space); the transformation also shows the input cube.
  const is3d = picture === "columns" ? rows === 3 : rows === 3 || cols === 3;
  const det = valid && square ? determinant(Am) : null;

  // Discovery badge: a matrix that squashes space flat, seen as a transformation.
  const flat = picture === "transform" && det !== null && Math.abs(det) < 1e-9;
  useEffect(() => {
    if (flat) awardBadge("flatland");
  }, [flat]);

  // ---- scene ----
  const objects: SceneObject[] = [];
  if (valid && Ax) {
    const colsOf = (m: Matrix) => Array.from({ length: cols }, (_, j) => column(m, j));
    if (picture === "columns") {
      const columns = colsOf(Am);
      let tip: Vec3 = [0, 0, 0];
      columns.forEach((c, j) => {
        objects.push({ kind: "arrow", to: to3(c), color: columnColors[j], label: `a${sub[j]}`, width: 1.5, opacity: 0.4 });
      });
      columns.forEach((c, j) => {
        const next = to3(add(tip, scale(xv[j], c)));
        objects.push({ kind: "arrow", from: tip, to: next, color: columnColors[j], label: `${fmt(xv[j])}·a${sub[j]}`, dashed: j > 0, labelAt: "mid" });
        tip = next;
      });
      objects.push({ kind: "arrow", to: to3(Ax), color: "var(--vec-res)", label: "Ax", width: 3.5 });
    } else {
      const M = lerpFromIdentity(Am, t);
      const map = (v: number[]) => to3(matVec(M, v));
      unitShapeFaces(cols, (v) => to3(v)).forEach((f) =>
        objects.push({ kind: "polygon", points: f, color: "var(--muted)", fillOpacity: 0, dashed: true }),
      );
      unitShapeFaces(cols, map).forEach((f) => objects.push({ kind: "polygon", points: f, color: "var(--vec-res)", fillOpacity: 0.09 }));
      colsOf(M).forEach((c, j) =>
        objects.push({ kind: "arrow", to: to3(c), color: columnColors[j], label: `Ae${sub[j]}`, width: 2.5 }),
      );
      objects.push({ kind: "arrow", to: to3(xv), color: "var(--vec-a)", label: "x", width: 2, opacity: 0.6 });
      objects.push({ kind: "arrow", to: map(xv), color: "var(--vec-res)", label: "Ax", width: 3.5 });
    }
  }

  const legend =
    picture === "columns" ? (
      <Legend
        items={[
          ...Array.from({ length: cols }, (_, j) => ({ color: columnColors[j], label: `x${sub[j]}·a${sub[j]} (column ${j + 1} of A)` })),
          { color: "var(--vec-res)", label: "Ax" },
        ]}
      />
    ) : (
      <Legend
        items={[
          { color: "var(--muted)", label: cols === 3 ? "unit cube" : "unit square", dashed: true },
          { color: "var(--vec-res)", label: "its image under A" },
          ...Array.from({ length: cols }, (_, j) => ({ color: columnColors[j], label: `Ae${sub[j]}` })),
          { color: "var(--vec-a)", label: "x" },
        ]}
      />
    );

  const sceneControls =
    picture === "transform" ? (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
        <button
          type="button"
          className="rounded-md bg-accent px-3 py-1 text-accent-contrast transition hover:opacity-90"
          onClick={() => {
            setT(0);
            setPlaying(true);
            awardBadge("transformer");
          }}
        >
          ▶ Animate
        </button>
        <label className="flex flex-1 items-center gap-2">
          <span className="text-muted">I</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            aria-label="Interpolate from identity to A"
            className="min-w-24 flex-1 accent-[var(--accent)]"
            value={t}
            onChange={(e) => {
              setPlaying(false);
              setT(Number(e.target.value));
            }}
          />
          <span className="text-muted">A</span>
        </label>
        <span className="whitespace-nowrap font-mono text-xs text-muted">t = {t.toFixed(2)}</span>
      </div>
    ) : null;

  return (
    <Workspace
      key={`${picture}-${is3d}`}
      defaultView={is3d ? "3d" : "2d"}
      objects={objects}
      legend={legend}
      sceneControls={sceneControls}
      sceneHeader={
        <Segmented
          label="Picture"
          value={picture}
          onChange={setPicture}
          options={[
            { value: "columns", label: "Columns" },
            { value: "transform", label: "Transformation" },
          ]}
        />
      }
    >
      <Card
        title="Input"
        aside={
          <div className="flex gap-3">
            <SizeSelect label="Rows m" value={rows} onChange={(r) => resizeTo(r, cols)} />
            <SizeSelect label="Columns n" value={cols} onChange={(c) => resizeTo(rows, c)} />
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
          <MatrixEditor name="A" values={A} onChange={setA} colorColumns />
          <MatrixEditor name="x" color="var(--vec-a)" values={x} onChange={setX} />
        </div>
      </Card>

      <Card title="Computation">
        {!valid || !Ax ? (
          <p className="text-sm text-danger">Please correct the highlighted entries.</p>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted">Row by row: entry i is (row i of A) • x</h3>
              <Equation>
                <span className="font-mono text-sm">Ax</span>
                <Sym>=</Sym>
                <MatrixView
                  cells={asColumn(Am.map((row) => row.map((a, j) => `${paren(a)}·${paren(xv[j])}`).join(" + ")))}
                />
                <Sym>=</Sym>
                <MatrixView cells={asColumn(Ax)} color="var(--vec-res)" highlight />
              </Equation>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted">Column by column: Ax is a linear combination of the columns of A</h3>
              <Equation>
                <span className="font-mono text-sm">Ax</span>
                <Sym>=</Sym>
                {Array.from({ length: cols }, (_, j) => (
                  <span key={j} className="inline-flex items-center gap-1">
                    {j > 0 && <Sym>+</Sym>}
                    <span className="font-mono text-sm">{paren(xv[j])}·</span>
                    <MatrixView cells={asColumn(column(Am, j))} color={columnColors[j]} />
                  </span>
                ))}
                <Sym>=</Sym>
                <MatrixView cells={asColumn(Ax)} color="var(--vec-res)" highlight />
              </Equation>
            </div>
            <div className="text-sm text-muted">
              <p>
                A is a ({rows}×{cols})-matrix, so it maps vectors of ℝ{cols === 2 ? "²" : "³"} to vectors of ℝ
                {rows === 2 ? "²" : "³"}. Its j-th column is the image of the j-th basis vector: Ae{sub[0]} is column 1, and so
                on.
              </p>
              {det !== null && (
                <p className="mt-2">
                  det A = <span className="font-mono text-foreground">{fmt(det)}</span>:{" "}
                  {Math.abs(det) < 1e-9
                    ? `A squashes the unit ${cols === 3 ? "cube" : "square"} flat — information is lost, so A is not invertible.`
                    : `${cols === 3 ? "volumes" : "areas"} are scaled by |det A| = ${fmt(Math.abs(det))}${det < 0 ? ", and the orientation is flipped (mirror image)" : ""}.`}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>
    </Workspace>
  );
}
