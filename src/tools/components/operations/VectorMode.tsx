"use client";

import { useState } from "react";
import type { SceneObject } from "@/components/scene3d/Scene3D";
import { add, angle, dot, norm, scale, sub, to3, type Vec3 } from "@/lib/linalg/vector";
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
  asColumn,
  fmt,
  paren,
  parseGrid,
  parseNum,
  resize,
} from "./ui";

type VectorOp = "add" | "sub" | "scale" | "lincomb" | "dot";

const ops: { value: VectorOp; label: string }[] = [
  { value: "add", label: "a + b" },
  { value: "sub", label: "a − b" },
  { value: "scale", label: "λ · a" },
  { value: "lincomb", label: "λa + μb" },
  { value: "dot", label: "a • b" },
];

const explanations: Record<VectorOp, string> = {
  add: "Move b so that its tail sits on the tip of a. The sum a + b runs from the tail of a to the tip of the moved b — the diagonal of the parallelogram spanned by a and b. Numerically: add the components.",
  sub: "a − b = a + (−1)·b. If a and b start at the same point, a − b is the vector from the tip of b to the tip of a.",
  scale: "λ·a multiplies every component by λ. |λ| > 1 stretches, |λ| < 1 shrinks, and a negative λ reverses the direction. Try the slider!",
  lincomb: "A linear combination scales each vector and adds the results: λ·a + μ·b. Geometrically: walk along λ·a, then along μ·b.",
  dot: "a • b = a₁b₁ + a₂b₂ (+ a₃b₃) = |a|·|b|·cos φ. It is 0 exactly when a ⊥ b. The dashed line drops b perpendicularly onto a (projection).",
};

interface Preset {
  label: string;
  dim: number;
  a: number[];
  b: number[];
  op: VectorOp;
  lambda?: string;
  mu?: string;
}

const presets: Preset[] = [
  { label: "Folie 10: a + b", dim: 2, a: [-5, 3], b: [11, 7], op: "add" },
  { label: "Folie 13: 3·a", dim: 2, a: [3, 2], b: [1, 1], op: "scale", lambda: "3" },
  { label: "Folie 15: a − b", dim: 2, a: [4, 3], b: [1, 2], op: "sub" },
  { label: "a ⊥ b (Folie 36)", dim: 2, a: [2, 1], b: [-1, 2], op: "dot" },
  { label: "3D: 2a − b", dim: 3, a: [1, 2, 1], b: [3, -1, 2], op: "lincomb", lambda: "2", mu: "-1" },
  { label: "3D: angle", dim: 3, a: [4, 2, 9], b: [3, 1, 6], op: "dot" },
];

const toStrings = (v: number[]) => v.map((x) => [String(x)]);

export default function VectorMode() {
  const [dim, setDim] = useState(2);
  const [a, setA] = useState(() => toStrings(presets[0].a));
  const [b, setB] = useState(() => toStrings(presets[0].b));
  const [lambda, setLambda] = useState("3");
  const [mu, setMu] = useState("1");
  const [op, setOp] = useState<VectorOp>("add");

  function applyPreset(p: Preset) {
    setDim(p.dim);
    setA(toStrings(p.a));
    setB(toStrings(p.b));
    setOp(p.op);
    if (p.lambda) setLambda(p.lambda);
    if (p.mu) setMu(p.mu);
  }

  function changeDim(n: number) {
    setDim(n);
    setA((v) => resize(v, n, 1));
    setB((v) => resize(v, n, 1));
  }

  const av = parseGrid(a)?.map((r) => r[0]);
  const bv = parseGrid(b)?.map((r) => r[0]);
  const l = parseNum(lambda);
  const m = parseNum(mu);
  const valid = av && bv && l !== null && m !== null;

  const usesB = op !== "scale";
  const usesLambda = op === "scale" || op === "lincomb";

  // ---- result & formulas ----
  let result: number[] | null = null;
  let middle: string[] = [];
  let lhs = "";
  if (valid) {
    const idx = av.map((_, i) => i);
    switch (op) {
      case "add":
        result = add(av, bv);
        middle = idx.map((i) => `${fmt(av[i])} + ${paren(bv[i])}`);
        lhs = "a + b";
        break;
      case "sub":
        result = sub(av, bv);
        middle = idx.map((i) => `${fmt(av[i])} − ${paren(bv[i])}`);
        lhs = "a − b";
        break;
      case "scale":
        result = scale(l, av);
        middle = idx.map((i) => `${paren(l)} · ${paren(av[i])}`);
        lhs = `${paren(l)} · a`;
        break;
      case "lincomb":
        result = add(scale(l, av), scale(m, bv));
        middle = idx.map((i) => `${paren(l)}·${paren(av[i])} + ${paren(m)}·${paren(bv[i])}`);
        lhs = `${paren(l)}·a + ${paren(m)}·b`;
        break;
      case "dot":
        break;
    }
  }

  // ---- scene ----
  const objects: SceneObject[] = [];
  if (valid) {
    const A = to3(av);
    const B = to3(bv);
    const O: Vec3 = [0, 0, 0];
    const arrowA = (extra = {}) => ({ kind: "arrow" as const, to: A, color: "var(--vec-a)", label: "a", ...extra });
    const arrowB = (extra = {}) => ({ kind: "arrow" as const, to: B, color: "var(--vec-b)", label: "b", ...extra });
    const res = result ? to3(result) : O;
    const resArrow = (label: string) => ({ kind: "arrow" as const, to: res, color: "var(--vec-res)", label, width: 3.5 });
    switch (op) {
      case "add": {
        const tip = to3(add(A, B));
        objects.push(
          { kind: "polygon", points: [O, A, tip, B], color: "var(--vec-res)", fillOpacity: 0.07 },
          arrowA(),
          arrowB({ opacity: 0.45, label: undefined }),
          { kind: "arrow", from: A, to: tip, color: "var(--vec-b)", dashed: true, label: "b", labelAt: "mid" },
          resArrow("a + b"),
        );
        break;
      }
      case "sub":
        objects.push(
          arrowA(),
          arrowB(),
          { kind: "arrow", from: B, to: A, color: "var(--vec-res)", dashed: true, width: 2.5 },
          resArrow("a − b"),
        );
        break;
      case "scale":
        objects.push(arrowA({ width: 5, opacity: 0.35 }), resArrow(`${fmt(l!)}·a`));
        break;
      case "lincomb": {
        const la = to3(scale(l!, av));
        objects.push(
          arrowA({ opacity: 0.35, width: 1.5 }),
          arrowB({ opacity: 0.35, width: 1.5 }),
          { kind: "arrow", to: la, color: "var(--vec-a)", label: `${fmt(l!)}a`, labelAt: "mid" },
          { kind: "arrow", from: la, to: res, color: "var(--vec-b)", dashed: true, label: `${fmt(m!)}b`, labelAt: "mid" },
          resArrow("λa + μb"),
        );
        break;
      }
      case "dot": {
        objects.push(arrowA(), arrowB());
        const phi = angle(av, bv);
        const na = norm(av);
        if (phi !== null && na > 0) {
          const proj = to3(scale(dot(av, bv) / (na * na), av));
          objects.push(
            { kind: "line", points: [B, proj], color: "var(--muted)", dashed: true, width: 1.2 },
            { kind: "arrow", to: proj, color: "var(--vec-res)", width: 2, label: "proj", opacity: 0.8 },
          );
          if (phi > 1e-3 && phi < Math.PI - 1e-3) {
            const r = 0.35 * Math.min(na, norm(bv));
            const ua = to3(scale(1 / na, av));
            const ub = to3(scale(1 / norm(bv), bv));
            const arc: Vec3[] = Array.from({ length: 25 }, (_, k) => {
              const t = k / 24;
              const wa = Math.sin((1 - t) * phi) / Math.sin(phi);
              const wb = Math.sin(t * phi) / Math.sin(phi);
              return to3(scale(r, add(scale(wa, ua), scale(wb, ub))));
            });
            objects.push({ kind: "line", points: arc, color: "var(--foreground)", width: 1.5 });
            objects.push({ kind: "point", at: arc[12], color: "var(--foreground)", label: "φ" });
          }
        }
        break;
      }
    }
  }

  // ---- dot product details ----
  const dotInfo = valid
    ? (() => {
        const d = dot(av, bv);
        const na = norm(av);
        const nb = norm(bv);
        const phi = angle(av, bv);
        return { d, na, nb, phi };
      })()
    : null;

  const legend = (
    <Legend
      items={[
        { color: "var(--vec-a)", label: "a" },
        ...(usesB ? [{ color: "var(--vec-b)", label: "b" }] : []),
        { color: "var(--vec-res)", label: op === "dot" ? "projection of b onto a" : "result" },
      ]}
    />
  );

  return (
    <Workspace key={dim} defaultView={dim === 3 ? "3d" : "2d"} objects={objects} legend={legend}>
      <Card title="Input" aside={<SizeSelect label="Dimension" value={dim} onChange={changeDim} />}>
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
        <Segmented label="Operation" value={op} onChange={setOp} options={ops} />
        <div className="flex flex-wrap items-center gap-6">
          <MatrixEditor name="a" color="var(--vec-a)" values={a} onChange={setA} />
          {usesB && <MatrixEditor name="b" color="var(--vec-b)" values={b} onChange={setB} />}
        </div>
        {usesLambda && (
          <div className="flex flex-col gap-3">
            <ScalarSlider name="λ" value={lambda} onChange={setLambda} />
            {op === "lincomb" && <ScalarSlider name="μ" value={mu} onChange={setMu} />}
          </div>
        )}
      </Card>

      <Card title="Computation">
        {!valid ? (
          <p className="text-sm text-danger">Please correct the highlighted entries.</p>
        ) : op === "dot" && dotInfo ? (
          <div className="flex flex-col gap-3 font-mono text-sm">
            <p>
              a • b = {av.map((x, i) => `${paren(x)}·${paren(bv[i])}`).join(" + ")} ={" "}
              <strong className="text-vec-res">{fmt(dotInfo.d)}</strong>
            </p>
            <p>
              |a| = √({av.map((x) => `${paren(x)}²`).join(" + ")}) = {fmt(dotInfo.na)}
            </p>
            <p>
              |b| = √({bv.map((x) => `${paren(x)}²`).join(" + ")}) = {fmt(dotInfo.nb)}
            </p>
            {dotInfo.phi === null ? (
              <p className="text-muted">The angle is undefined for the zero vector.</p>
            ) : (
              <>
                <p>
                  cos φ = a • b / (|a|·|b|) = {fmt(dotInfo.d)} / ({fmt(dotInfo.na)} · {fmt(dotInfo.nb)}) ={" "}
                  {fmt(Math.cos(dotInfo.phi))}
                </p>
                <p>
                  φ = <strong className="text-vec-res">{fmt((dotInfo.phi * 180) / Math.PI)}°</strong>
                </p>
              </>
            )}
            {Math.abs(dotInfo.d) < 1e-9 && (
              <p className="self-start rounded-full bg-success/10 px-3 py-1 font-sans font-medium text-success">
                a • b = 0 → a and b are orthogonal (a ⊥ b)
              </p>
            )}
          </div>
        ) : (
          result && (
            <div className="flex flex-col gap-4">
              <Equation>
                <span className="font-mono text-sm">{lhs}</span>
                <Sym>=</Sym>
                <MatrixView cells={asColumn(middle)} />
                <Sym>=</Sym>
                <MatrixView cells={asColumn(result)} color="var(--vec-res)" highlight />
              </Equation>
              <p className="font-mono text-sm text-muted">
                length: |result| = {fmt(norm(result))}
              </p>
            </div>
          )
        )}
        <p className="text-sm text-muted">{explanations[op]}</p>
      </Card>
    </Workspace>
  );
}

function ScalarSlider({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  const n = parseNum(value);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <NumberField name={name} value={value} onChange={onChange} />
      <input
        type="range"
        min={-3}
        max={3}
        step={0.1}
        aria-label={`${name} slider`}
        className="w-48 accent-[var(--accent)]"
        value={n ?? 0}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
