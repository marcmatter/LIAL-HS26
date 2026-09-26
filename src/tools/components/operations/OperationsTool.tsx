"use client";

import { useState } from "react";
import MatOpsMode from "./MatOpsMode";
import MatVecMode from "./MatVecMode";
import VectorMode from "./VectorMode";

const modes = [
  { id: "vectors", label: "Vectors", hint: "a + b, λ·a, linear combinations, dot product", Component: VectorMode },
  { id: "matvec", label: "Matrix × vector", hint: "Ax — as a combination of columns and as a transformation", Component: MatVecMode },
  { id: "matops", label: "Matrix + matrix", hint: "A + B, A − B, λ·A", Component: MatOpsMode },
] as const;

type ModeId = (typeof modes)[number]["id"];

export default function OperationsTool() {
  const [mode, setMode] = useState<ModeId>("vectors");

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Topic" className="grid gap-2 sm:grid-cols-3">
        {modes.map((m) => {
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              id={`tab-${m.id}`}
              aria-selected={active}
              aria-controls={`panel-${m.id}`}
              className={`flex flex-col gap-0.5 rounded-xl border px-4 py-3 text-left transition ${
                active ? "border-accent bg-accent/10" : "border-border hover:border-accent"
              }`}
              onClick={() => setMode(m.id)}
            >
              <span className="font-medium">{m.label}</span>
              <span className="text-xs text-muted">{m.hint}</span>
            </button>
          );
        })}
      </div>

      {/* All modes stay mounted so their inputs survive switching tabs. */}
      {modes.map(({ id, Component }) => (
        <div key={id} role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} hidden={id !== mode}>
          <Component />
        </div>
      ))}
    </div>
  );
}
