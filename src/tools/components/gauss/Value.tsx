import type { Fraction } from "@/lib/linalg/fraction";

export type DisplayMode = "fraction" | "decimal";

export const formatValue = (f: Fraction, mode: DisplayMode) =>
  mode === "fraction" ? f.toString() : f.toDecimal(7);

/** Renders a number either as a stacked fraction or as a decimal. */
export default function Value({ value, mode }: { value: Fraction; mode: DisplayMode }) {
  if (mode === "decimal" || value.isInteger()) return <span>{formatValue(value, mode)}</span>;
  const n = value.n < 0n ? -value.n : value.n;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={value.toString()}>
      {value.isNegative() && <span>−</span>}
      <span className="inline-flex flex-col items-center text-[0.8em] leading-tight">
        <span>{n.toString()}</span>
        <span className="w-full border-t border-current text-center">{value.d.toString()}</span>
      </span>
    </span>
  );
}
