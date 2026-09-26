"use client";

interface SizeSelectorProps {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}

export default function SizeSelector({ label, value, onChange, min = 1, max = 8 }: SizeSelectorProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <select
        className="rounded-md border border-border bg-surface px-2 py-1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
