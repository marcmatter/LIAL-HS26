"use client";

import type { DragEvent } from "react";
import { useT } from "@/lib/i18n/lang";

export interface Factor {
  numer: string;
  denom: string;
}
export type FactorField = keyof Factor;

interface FactorInputProps {
  row: number;
  factor: Factor;
  invalid: boolean;
  armedField: FactorField | null;
  dragType: string;
  onChange: (field: FactorField, value: string) => void;
  onArm: (field: FactorField | null) => void;
}

/** A row factor entered as a stacked fraction: numerator over denominator. */
export default function FactorInput({ row, factor, invalid, armedField, dragType, onChange, onArm }: FactorInputProps) {
  const t = useT();
  const input = (field: FactorField) => (
    <input
      aria-label={t(
        `Row ${row + 1} factor ${field === "numer" ? "numerator" : "denominator"}`,
        `Zeile ${row + 1} Faktor ${field === "numer" ? "Zähler" : "Nenner"}`,
      )}
      inputMode="decimal"
      autoComplete="off"
      className={`h-6 w-16 rounded border bg-background px-1 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent ${
        invalid ? "border-danger" : armedField === field ? "border-accent" : "border-border"
      } ${factor[field] === "1" ? "text-muted" : ""}`}
      value={factor[field]}
      onChange={(e) => onChange(field, e.target.value)}
      onFocus={(e) => {
        onArm(field);
        e.target.select();
      }}
      onBlur={() => onArm(null)}
      onDragOver={(e: DragEvent) => {
        if (!e.dataTransfer.types.includes(dragType)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e: DragEvent) => {
        const value = e.dataTransfer.getData(dragType);
        if (!value) return;
        e.preventDefault();
        onChange(field, value);
      }}
    />
  );

  return (
    <div className="flex items-center gap-1.5" title={t("Row factor (drop a matrix entry here)", "Zeilenfaktor (Matrixeintrag hierher ziehen)")}>
      <span className="text-muted" aria-hidden>
        ·
      </span>
      <div className="flex flex-col items-center gap-0.5">
        {input("numer")}
        <span className="h-px w-full bg-foreground/50" aria-hidden />
        {input("denom")}
      </div>
    </div>
  );
}
