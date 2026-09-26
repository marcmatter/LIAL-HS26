"use client";

import { useMemo, useState } from "react";
import MatrixInput, { resizeGrid } from "@/components/MatrixInput";
import SizeSelector from "@/components/SizeSelector";
import { determinant, formatNumber, parseEntry } from "@/lib/linalg/matrix";

export default function DeterminantTool() {
  const [n, setN] = useState(3);
  const [values, setValues] = useState(() => resizeGrid([], 3, 3));

  const result = useMemo(() => {
    const m = values.map((row) => row.map(parseEntry));
    if (m.some((row) => row.some(Number.isNaN))) return { error: "Some entries are not valid numbers." };
    return { value: determinant(m) };
  }, [values]);

  return (
    <div className="flex flex-col gap-6">
      <SizeSelector
        label="Size n × n"
        value={n}
        onChange={(size) => {
          setN(size);
          setValues((v) => resizeGrid(v, size, size));
        }}
      />
      <MatrixInput label="A" rows={n} cols={n} values={values} onChange={setValues} />
      <div className="rounded-lg border border-border bg-surface p-4">
        {"error" in result ? (
          <p className="text-red-600 dark:text-red-400">{result.error}</p>
        ) : (
          <p className="font-mono text-lg">
            det(A) = <strong>{formatNumber(result.value!)}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
