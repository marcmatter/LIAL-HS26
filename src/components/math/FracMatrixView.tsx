import type { ReactNode } from "react";
import type { Fraction } from "@/lib/linalg/fraction";
import Value from "@/tools/components/gauss/Value";
import { Paren } from "@/tools/components/operations/ui";

export type CellTone = "accent" | "success" | "danger" | "muted" | "row" | "col";

const toneClass: Record<CellTone, string> = {
  accent: "rounded bg-accent/20 font-semibold text-foreground ring-1 ring-accent",
  success: "rounded bg-success/15 font-semibold text-success ring-1 ring-success/50",
  danger: "rounded bg-danger/15 font-semibold text-danger ring-1 ring-danger/50",
  muted: "text-muted",
  row: "bg-vec-a/15",
  col: "bg-vec-b/15",
};

/** A matrix of exact fractions in round brackets; `tone(i, j)` highlights single entries. */
export default function FracMatrixView({
  m,
  label,
  tone,
  divider,
}: {
  m: Fraction[][];
  label?: ReactNode;
  tone?: (i: number, j: number) => CellTone | undefined;
  /** Draw a vertical line before this column (augmented matrices). */
  divider?: number;
}) {
  const cols = m[0]?.length ?? 0;
  return (
    <span className="inline-flex items-center gap-1.5">
      {label && <span className="font-serif text-base italic">{label}</span>}
      {label && <span className="text-muted">=</span>}
      <Paren>
        <span className="grid items-center gap-x-1 gap-y-1 font-mono text-sm" style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}>
          {m.map((row, i) =>
            row.map((x, j) => {
              const t = tone?.(i, j);
              return (
                <span
                  key={`${i}-${j}`}
                  className={`min-w-8 px-1.5 py-0.5 text-center ${t ? toneClass[t] : x.isZero() ? "text-muted" : ""} ${
                    divider === j ? "border-l-2 border-foreground/40" : ""
                  }`}
                >
                  <Value value={x} mode="fraction" />
                </span>
              );
            }),
          )}
        </span>
      </Paren>
    </span>
  );
}
