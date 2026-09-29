"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { Vec3 } from "@/lib/linalg/vector";
import { useT } from "@/lib/i18n/lang";

export type { Vec3 };

interface Common {
  color: string;
  label?: string;
  dashed?: boolean;
  width?: number;
  opacity?: number;
}
export interface SceneArrow extends Common {
  kind: "arrow";
  from?: Vec3;
  to: Vec3;
  /** Put the label beside the middle of the arrow instead of at its tip. */
  labelAt?: "tip" | "mid";
}
export interface SceneLine extends Common {
  kind: "line";
  points: Vec3[];
}
export interface ScenePolygon {
  kind: "polygon";
  points: Vec3[];
  color: string;
  fillOpacity?: number;
  dashed?: boolean;
}
export interface ScenePoint {
  kind: "point";
  at: Vec3;
  color: string;
  label?: string;
}
export type SceneObject = SceneArrow | SceneLine | ScenePolygon | ScenePoint;

export type ViewMode = "3d" | "2d";

interface Scene3DProps {
  objects: SceneObject[];
  view: ViewMode;
  /** Minimum half-width of the visible region, in world units. */
  minExtent?: number;
  children?: ReactNode;
}

const W = 640;
const H = 520;
const DEFAULT_CAMERA = { yaw: -125, pitch: 22 };

function niceCeil(x: number): number {
  const steps = [1, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const p = 10 ** Math.floor(Math.log10(x));
  return (steps.find((s) => s * p >= x - 1e-9) ?? 10) * p;
}

function gridStep(extent: number): number {
  const raw = extent / 5;
  const p = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 5, 10].find((s) => s * p >= raw - 1e-9) ?? 10) * p;
}

function pointsOf(o: SceneObject): Vec3[] {
  switch (o.kind) {
    case "arrow":
      return [o.from ?? [0, 0, 0], o.to];
    case "line":
    case "polygon":
      return o.points;
    case "point":
      return [o.at];
  }
}

const fmtTick = (x: number) => Number(x.toFixed(4)).toString();

/**
 * Minimal 3D renderer for vectors and shapes, drawn as SVG with an orthographic
 * camera. Drag to rotate (3D view), buttons to zoom and reset. Math convention:
 * z points up. In "2d" view the camera looks straight down onto the xy-plane.
 */
export default function Scene3D({ objects, view, minExtent = 1, children }: Scene3DProps) {
  const [camera, setCamera] = useState(DEFAULT_CAMERA);
  const t = useT();
  const [zoom, setZoom] = useState(1);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const is3d = view === "3d";
  const yaw = ((is3d ? camera.yaw : 0) * Math.PI) / 180;
  const pitch = ((is3d ? camera.pitch : 90) * Math.PI) / 180;

  const maxCoord = Math.max(
    minExtent,
    ...objects.flatMap(pointsOf).flatMap((p) => (is3d ? p : [p[0], p[1]]).map(Math.abs)),
  );
  const extent = niceCeil(Number.isFinite(maxCoord) ? maxCoord : 1);
  const step = gridStep(extent);
  const s = (zoom * (Math.min(W, H) / 2)) / (extent * (is3d ? 1.55 : 1.18));

  const project = ([x, y, z]: Vec3) => {
    const x1 = x * Math.cos(yaw) - y * Math.sin(yaw);
    const y1 = x * Math.sin(yaw) + y * Math.cos(yaw);
    return {
      x: W / 2 + s * x1,
      y: H / 2 - s * (z * Math.cos(pitch) + y1 * Math.sin(pitch)),
      depth: y1 * Math.cos(pitch) - z * Math.sin(pitch),
    };
  };
  const depthOf = (pts: Vec3[]) => pts.reduce((d, p) => d + project(p).depth, 0) / pts.length;

  // ---- static scenery: grid and axes ----
  const grid: ReactNode[] = [];
  const ticks: ReactNode[] = [];
  for (let k = -extent; k <= extent + 1e-9; k += step) {
    const a = project([k, -extent, 0]);
    const b = project([k, extent, 0]);
    const c = project([-extent, k, 0]);
    const d = project([extent, k, 0]);
    const key = k.toFixed(6);
    grid.push(
      <line key={`gx${key}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />,
      <line key={`gy${key}`} x1={c.x} y1={c.y} x2={d.x} y2={d.y} />,
    );
    // In 3D, label every other tick only, to keep the origin readable.
    const labelled = !is3d || Math.round(k / step) % 2 === 0;
    if (Math.abs(k) > 1e-9 && labelled) {
      const tx = project([k, 0, 0]);
      const ty = project([0, k, 0]);
      ticks.push(
        <text key={`tx${key}`} x={tx.x} y={tx.y + 14} textAnchor="middle">
          {fmtTick(k)}
        </text>,
        <text key={`ty${key}`} x={ty.x - 8} y={ty.y + 4} textAnchor="end">
          {fmtTick(k)}
        </text>,
      );
      if (is3d) {
        const tz = project([0, 0, k]);
        ticks.push(
          <text key={`tz${key}`} x={tz.x - 8} y={tz.y + 4} textAnchor="end">
            {fmtTick(k)}
          </text>,
        );
      }
    }
  }

  const axisLen = extent * 1.12;
  const axes: SceneArrow[] = [
    { kind: "arrow", from: [-axisLen, 0, 0], to: [axisLen, 0, 0], color: "var(--axis-x)", label: "x", width: 1.2 },
    { kind: "arrow", from: [0, -axisLen, 0], to: [0, axisLen, 0], color: "var(--axis-y)", label: "y", width: 1.2 },
  ];
  if (is3d) axes.push({ kind: "arrow", from: [0, 0, -axisLen], to: [0, 0, axisLen], color: "var(--axis-z)", label: "z", width: 1.2 });

  // ---- scene objects, painted back to front ----
  const all = [...axes.map((a) => ({ ...a, axis: true })), ...objects.map((o) => ({ ...o, axis: false }))];
  const sorted = all
    .map((o, i) => ({ o, i, depth: depthOf(pointsOf(o)) }))
    .sort((a, b) => (a.o.kind === "polygon") === (b.o.kind === "polygon") ? b.depth - a.depth : a.o.kind === "polygon" ? -1 : 1);

  const renderObject = (o: (typeof all)[number], key: number) => {
    const dash = "dashed" in o && o.dashed ? "6 5" : undefined;
    switch (o.kind) {
      case "polygon": {
        const pts = o.points.map(project).map((p) => `${p.x},${p.y}`).join(" ");
        return (
          <polygon
            key={key}
            points={pts}
            style={{ fill: o.color, fillOpacity: o.fillOpacity ?? 0.12, stroke: o.color }}
            strokeOpacity={0.55}
            strokeWidth={1}
            strokeDasharray={dash}
            strokeLinejoin="round"
          />
        );
      }
      case "line": {
        const pts = o.points.map(project).map((p) => `${p.x},${p.y}`).join(" ");
        return (
          <polyline
            key={key}
            points={pts}
            fill="none"
            style={{ stroke: o.color }}
            strokeWidth={o.width ?? 1.5}
            strokeDasharray={dash}
            strokeOpacity={o.opacity ?? 1}
            strokeLinecap="round"
          />
        );
      }
      case "point": {
        const p = project(o.at);
        return (
          <g key={key}>
            <circle cx={p.x} cy={p.y} r={4} style={{ fill: o.color }} />
            {o.label && <Label x={p.x + 8} y={p.y - 8} color={o.color} text={o.label} />}
          </g>
        );
      }
      case "arrow": {
        const a = project(o.from ?? [0, 0, 0]);
        const b = project(o.to);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        const width = o.width ?? 2.5;
        if (len < 2) {
          return o.axis ? null : (
            <g key={key} opacity={o.opacity ?? 1}>
              <circle cx={b.x} cy={b.y} r={3.5} style={{ fill: o.color }} />
            </g>
          );
        }
        const ux = dx / len;
        const uy = dy / len;
        const h = Math.min(8 + width * 2.2, len * 0.45);
        const hw = h * 0.42;
        const bx = b.x - ux * h * 0.85;
        const by = b.y - uy * h * 0.85;
        const head = `${b.x},${b.y} ${b.x - ux * h - uy * hw},${b.y - uy * h + ux * hw} ${b.x - ux * h + uy * hw},${b.y - uy * h - ux * hw}`;
        return (
          <g key={key} opacity={o.opacity ?? 1}>
            <line
              x1={a.x}
              y1={a.y}
              x2={bx}
              y2={by}
              style={{ stroke: o.color }}
              strokeWidth={width}
              strokeDasharray={dash}
              strokeLinecap="round"
            />
            <polygon points={head} style={{ fill: o.color }} />
            {o.label &&
              (o.labelAt === "mid" ? (
                <Label x={(a.x + b.x) / 2 - uy * 14} y={(a.y + b.y) / 2 + ux * 14 + 4} color={o.color} text={o.label} />
              ) : (
                <Label
                  x={b.x + ux * 12 + (Math.abs(uy) > 0.9 ? 10 : 0)}
                  y={b.y + uy * 12 + 4}
                  color={o.color}
                  text={o.label}
                  axis={o.axis}
                />
              ))}
          </g>
        );
      }
    }
  };

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (!is3d) return;
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    setCamera((c) => ({ yaw: c.yaw - dx * 0.5, pitch: Math.max(-89, Math.min(89, c.pitch + dy * 0.4)) }));
  }

  const btn =
    "flex h-8 min-w-8 items-center justify-center rounded-md border border-border bg-background/90 px-2 text-sm backdrop-blur hover:border-accent";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`block h-auto w-full select-none ${is3d ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
        role="img"
        aria-label={
          is3d
            ? t("3D view of the vectors. Drag to rotate.", "3D-Ansicht der Vektoren. Zum Drehen ziehen.")
            : t("2D view of the vectors in the xy-plane.", "2D-Ansicht der Vektoren in der xy-Ebene.")
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <g stroke="var(--grid)" strokeWidth={1}>
          {grid}
        </g>
        <g fontSize={11} style={{ fill: "var(--muted)" }}>
          {ticks}
        </g>
        {sorted.map(({ o, i }) => renderObject(o, i))}
      </svg>

      <div className="absolute right-2 top-2 flex gap-1">
        <button type="button" className={btn} aria-label={t("Zoom in", "Vergrössern")} onClick={() => setZoom((z) => Math.min(4, z * 1.25))}>
          +
        </button>
        <button type="button" className={btn} aria-label={t("Zoom out", "Verkleinern")} onClick={() => setZoom((z) => Math.max(0.25, z / 1.25))}>
          −
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
            setCamera(DEFAULT_CAMERA);
            setZoom(1);
          }}
        >
          {t("Reset view", "Ansicht zurücksetzen")}
        </button>
      </div>
      {is3d && (
        <p className="pointer-events-none absolute bottom-2 left-3 text-xs text-muted">{t("Drag to rotate", "Zum Drehen ziehen")}</p>
      )}
      {children}
    </div>
  );
}

function Label({ x, y, color, text, axis }: { x: number; y: number; color: string; text: string; axis?: boolean }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={axis ? 13 : 14}
      fontWeight={axis ? 500 : 600}
      fontStyle={axis ? "italic" : undefined}
      style={{ fill: color, stroke: "var(--surface)", strokeWidth: 4, paintOrder: "stroke" }}
    >
      {text}
    </text>
  );
}
