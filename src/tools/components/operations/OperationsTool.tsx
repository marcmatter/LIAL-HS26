"use client";

import { useState } from "react";
import MatMulMode from "./MatMulMode";
import MatOpsMode from "./MatOpsMode";
import MatVecMode from "./MatVecMode";
import SpecialMode from "./SpecialMode";
import VectorMode from "./VectorMode";
import { L, tr, useLang } from "@/lib/i18n/lang";

const modes = [
  {
    id: "vectors",
    label: L("Vectors", "Vektoren"),
    hint: L("a + b, λ·a, linear combinations, dot product", "a + b, λ·a, Linearkombinationen, Skalarprodukt"),
    Component: VectorMode,
  },
  {
    id: "matvec",
    label: L("Matrix × vector", "Matrix × Vektor"),
    hint: L("Ax — as a combination of columns and as a transformation", "Ax — als Kombination der Spalten und als Abbildung"),
    Component: MatVecMode,
  },
  { id: "matops", label: L("Matrix + matrix", "Matrix + Matrix"), hint: L("A + B, A − B, λ·A", "A + B, A − B, λ·A"), Component: MatOpsMode },
  {
    id: "matmul",
    label: L("Matrix × matrix", "Matrix × Matrix"),
    hint: L("AB row · column, AB ≠ BA, composition", "AB Zeile · Spalte, AB ≠ BA, Verkettung"),
    Component: MatMulMode,
  },
  {
    id: "special",
    label: L("Special matrices", "Spezielle Matrizen"),
    hint: L("E, Aᵀ, A⁻¹, permutation P", "E, Aᵀ, A⁻¹, Permutation P"),
    Component: SpecialMode,
  },
] as const;

type ModeId = (typeof modes)[number]["id"];

export default function OperationsTool() {
  const [mode, setMode] = useState<ModeId>("vectors");
  const lang = useLang();

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label={tr(lang, L("Topic", "Thema"))} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
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
              <span className="font-medium">{tr(lang, m.label)}</span>
              <span className="text-xs text-muted">{tr(lang, m.hint)}</span>
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
