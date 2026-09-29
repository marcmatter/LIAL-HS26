"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import FracMatrixView from "@/components/math/FracMatrixView";
import MatrixGridEditor from "@/components/matrix-editor/MatrixGridEditor";
import { Fraction } from "@/lib/linalg/fraction";
import { equalF, fromNumbers, mulF } from "@/lib/linalg/fracMatrix";
import { backSubstitution, forwardSubstitution, luDecompose, type LuStep } from "@/lib/linalg/lu";
import type { FracMatrix } from "@/lib/linalg/rowOps";
import { awardBadge, recordAnswer } from "@/lib/game/progress";
import { useT } from "@/lib/i18n/lang";

interface Preset {
  id: string;
  label: string;
  A: number[][];
  b?: number[];
}

const presets: Preset[] = [
  { id: "f24", label: "Folie 24: 2×2 + b", A: [[1, 2], [4, 9]], b: [5, 21] },
  { id: "f18", label: "Folie 18: 2×2", A: [[2, 1], [8, 7]] },
  { id: "f19", label: "Folie 19: 3×3", A: [[1, 2, 1], [2, 1, 0], [-3, 0, 9]] },
  { id: "f26", label: "Folie 26: 3×3 + P", A: [[0, 1, 1], [1, 2, 1], [2, 7, 9]], b: [0, 0, 4] },
];

const sub = (n: number) => String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);
const col = (v: Fraction[]) => v.map((x) => [x]);

export default function LuTool() {
  const [presetId, setPresetId] = useState(presets[0].id);
  const t = useT();
  const [A, setA] = useState<FracMatrix>(() => fromNumbers(presets[0].A));
  const [b, setB] = useState<Fraction[] | null>(() => fromNumbers([presets[0].b!]).at(0)!);
  const [editor, setEditor] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(1);
  const [quiz, setQuiz] = useState(false);
  const [solvedQuiz, setSolvedQuiz] = useState<Set<number>>(new Set());

  const n = A.length;
  const lu = useMemo(() => luDecompose(A), [A]);

  function load(m: FracMatrix, rhs: Fraction[] | null, id: string) {
    setA(m);
    setB(rhs);
    setPresetId(id);
    setShown(quiz ? 0 : 1);
    setSolvedQuiz(new Set());
    setError(null);
  }

  // ---- sections revealed one by one ----
  const sections: { title: string; body: ReactNode; stepIndex?: number }[] = [];
  lu.steps.forEach((step, k) => sections.push({ title: stepTitle(step, t), body: <StepBody step={step} />, stepIndex: k }));

  const PA = mulF(lu.P, A);
  sections.push({
    title: lu.singular
      ? t("Result: A is singular", "Ergebnis: A ist singulär")
      : lu.swapped
        ? t("Result: P·A = L·U", "Ergebnis: P·A = L·U")
        : t("Result: A = L·U", "Ergebnis: A = L·U"),
    body: (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {lu.swapped && <FracMatrixView m={lu.P} label="P" />}
          <FracMatrixView m={lu.L} label="L" tone={(i, j) => (i > j ? "accent" : undefined)} />
          <FracMatrixView m={lu.U} label="U" tone={(i, j) => (i === j ? "success" : undefined)} />
        </div>
        <p className="text-sm">
          {lu.singular ? (
            <span className="text-danger">
              {t(
                "A pivot is 0 and no row swap can fix it — A is singular, so Ax = b has no unique solution.",
                "Ein Pivot ist 0 und lässt sich durch Zeilentausch nicht ersetzen — A ist singulär, Ax = b hat keine eindeutige Lösung.",
              )}
            </span>
          ) : (
            <>
              {t("Check", "Probe")}: {lu.swapped ? "P·A" : "A"} = L·U{" "}
              <strong className={equalF(PA, mulF(lu.L, lu.U)) ? "text-success" : "text-danger"}>
                {equalF(PA, mulF(lu.L, lu.U)) ? "✓" : "✗"}
              </strong>
              {t(
                <>
                  . L is lower triangular with ones on the diagonal; each multiplier l<sub>ij</sub> sits in row i, column j. U is
                  the row echelon form (upper triangular).
                </>,
                <>
                  . L ist eine untere Dreiecksmatrix mit Einsen auf der Diagonale; jeder Faktor l<sub>ij</sub> steht in Zeile i,
                  Spalte j. U ist die Zeilenstufenform (obere Dreiecksmatrix).
                </>,
              )}
            </>
          )}
        </p>
      </div>
    ),
  });

  const canSolve = b && !lu.singular && b.length === n;
  if (canSolve) {
    const pb = mulF(lu.P, col(b)).map((r) => r[0]);
    const forward = forwardSubstitution(lu.L, pb);
    const y = forward.map((l) => l.value);
    const back = backSubstitution(lu.U, y);
    const x = Array.from({ length: n }, (_, i) => back.find((l) => l.index === i)!.value);
    if (lu.swapped) {
      sections.push({
        title: t("Swap the right-hand side too: b̂ = P·b", "Rechte Seite mitvertauschen: b̂ = P·b"),
        body: (
          <div className="flex flex-wrap items-center gap-2">
            <FracMatrixView m={lu.P} label="P" />
            <span className="text-muted">·</span>
            <FracMatrixView m={col(b)} label="b" />
            <span className="text-muted">=</span>
            <FracMatrixView m={col(pb)} tone={() => "accent"} />
            <p className="w-full text-sm text-muted">{t("The rows of b are swapped exactly like the rows of A.", "Die Zeilen von b werden genau so vertauscht wie die Zeilen von A.")}</p>
          </div>
        ),
      });
    }
    sections.push({
      title: `${t("Forward substitution", "Vorwärtseinsetzen")}: L·y = ${lu.swapped ? "b̂" : "b"}`,
      body: (
        <SubstitutionBody
          matrix={lu.L}
          name="L"
          rhs={pb}
          rhsName={lu.swapped ? "b̂" : "b"}
          unknown="y"
          lines={forward.map((l) => l.text)}
          formula={t("yᵢ = (bᵢ − Σ lᵢₖ·yₖ for k < i) / lᵢᵢ — top to bottom", "yᵢ = (bᵢ − Σ lᵢₖ·yₖ für k < i) / lᵢᵢ — von oben nach unten")}
        />
      ),
    });
    sections.push({
      title: t("Back substitution: U·x = y", "Rückwärtseinsetzen: U·x = y"),
      body: (
        <SubstitutionBody
          matrix={lu.U}
          name="U"
          rhs={y}
          rhsName="y"
          unknown="x"
          lines={back.map((l) => l.text)}
          formula={t("xᵢ = (yᵢ − Σ rᵢₖ·xₖ for k > i) / rᵢᵢ — bottom to top", "xᵢ = (yᵢ − Σ rᵢₖ·xₖ für k > i) / rᵢᵢ — von unten nach oben")}
        />
      ),
    });
    const check = equalF(mulF(A, col(x)), col(b));
    sections.push({
      title: t("Solution", "Lösung"),
      body: (
        <div className="flex flex-wrap items-center gap-3">
          <FracMatrixView m={col(x)} label="x" tone={() => "success"} />
          <span className="text-sm">
            {t("Check", "Probe")} A·x = b <strong className={check ? "text-success" : "text-danger"}>{check ? "✓" : "✗"}</strong>
          </span>
        </div>
      ),
    });
  }

  const total = sections.length;
  const start = quiz ? 0 : 1;
  const allShown = shown >= total;
  const nextSection = sections[shown];
  const nextStep = nextSection?.stepIndex !== undefined ? lu.steps[nextSection.stepIndex] : undefined;
  const quizStep = quiz && nextStep?.kind === "eliminate" && !solvedQuiz.has(nextSection!.stepIndex!) ? nextStep : null;

  useEffect(() => {
    if (allShown && canSolve) awardBadge("decomposer");
  }, [allShown, canSolve]);

  const eliminations = lu.steps.filter((s) => s.kind === "eliminate").length;
  useEffect(() => {
    if (quiz && eliminations > 0 && solvedQuiz.size === eliminations) awardBadge("predictor");
  }, [quiz, eliminations, solvedQuiz]);

  const btn = "rounded-md border border-border bg-surface px-3 py-1.5 text-sm transition hover:border-accent disabled:opacity-40";

  return (
    <div className="flex flex-col gap-6">
      {/* Input */}
      <section className="flex flex-col gap-4 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={presetId === p.id}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                presetId === p.id ? "border-accent bg-accent/10" : "border-border text-muted hover:border-accent hover:text-foreground"
              }`}
              onClick={() => {
                load(fromNumbers(p.A), p.b ? fromNumbers([p.b])[0] : null, p.id);
                setEditor(false);
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            className={`rounded-full border px-3 py-1 text-xs transition ${editor ? "border-accent" : "border-border hover:border-accent"}`}
            onClick={() => {
              setEditorKey((k) => k + 1);
              setEditor(!editor);
            }}
          >
            ✎ {t("Your own matrix", "Eigene Matrix")}
          </button>
        </div>

        {editor && (
          <MatrixGridEditor
            key={editorKey}
            initial={A.map((row, i) => [...row.map(String), ...(b ? [String(b[i])] : [])])}
            initialAugmented={b !== null}
            submitLabel={t("Decompose", "Zerlegen")}
            onSubmit={(m, augmented) => {
              const Am = augmented ? m.map((row) => row.slice(0, -1)) : m;
              if (Am.length !== Am[0]?.length) {
                setError(
                  t(
                    `LU decomposition needs a square matrix A — yours is ${Am.length}×${Am[0]?.length ?? 0}${augmented ? " (plus column b)" : ""}.`,
                    `Die LR-Zerlegung braucht eine quadratische Matrix A — deine ist ${Am.length}×${Am[0]?.length ?? 0}${augmented ? " (plus Spalte b)" : ""}.`,
                  ),
                );
                return;
              }
              load(Am, augmented ? m.map((row) => row[row.length - 1]) : null, "custom");
              setEditor(false);
            }}
            onCancel={() => setEditor(false)}
          />
        )}
        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <FracMatrixView m={A} label="A" />
          {b && <FracMatrixView m={col(b)} label="b" />}
        </div>
      </section>

      {/* Steps */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {t("Step by step", "Schritt für Schritt")}{" "}
            <span className="text-sm font-normal text-muted">
              ({Math.min(shown, total)} {t("of", "von")} {total})
            </span>
          </h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--accent)]"
              checked={quiz}
              onChange={(e) => {
                // The quiz starts from the first step, so every multiplier can be predicted.
                setQuiz(e.target.checked);
                setShown(e.target.checked ? 0 : 1);
                setSolvedQuiz(new Set());
              }}
            />
            🔮 {t(<>Quiz: predict the multipliers l<sub>ij</sub> yourself</>, <>Quiz: Faktoren l<sub>ij</sub> selbst vorhersagen</>)}
          </label>
        </div>

        <ol className="flex flex-col gap-3">
          {sections.slice(0, shown).map((s, k) => (
            <li key={k} className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <h3 className="font-medium">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                  {k + 1}
                </span>
                {s.title}
              </h3>
              {s.body}
            </li>
          ))}
        </ol>

        {quizStep && quizStep.kind === "eliminate" && (
          <QuizCard
            key={`${presetId}-${nextSection!.stepIndex}`}
            step={quizStep}
            onSolved={(firstTry) => {
              recordAnswer("lu", true, firstTry ? 10 : 5, firstTry);
              setSolvedQuiz((s) => new Set(s).add(nextSection!.stepIndex!));
              setShown((v) => v + 1);
            }}
            onWrong={() => recordAnswer("lu", false, 0, false)}
          />
        )}

        <div className="flex flex-wrap gap-2">
          {!quizStep && (
            <button
              type="button"
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast hover:opacity-90 disabled:opacity-40"
              disabled={allShown}
              onClick={() => setShown((v) => v + 1)}
            >
              {t("Next step", "Nächster Schritt")} ▸
            </button>
          )}
          <button type="button" className={btn} disabled={allShown} onClick={() => setShown(total)}>
            {t("Show all", "Alle zeigen")}
          </button>
          <button type="button" className={btn} disabled={shown <= start} onClick={() => setShown((v) => Math.max(start, v - 1))}>
            ◂ {t("Back", "Zurück")}
          </button>
          <button
            type="button"
            className={btn}
            disabled={shown <= start}
            onClick={() => {
              setShown(start);
              setSolvedQuiz(new Set());
            }}
          >
            {t("Start over", "Von vorne")}
          </button>
        </div>
      </section>

      <Theory />
    </div>
  );
}

function stepTitle(step: LuStep, t: (en: string, de: string) => string): string {
  if (step.kind === "swap") {
    return t(
      `Pivot in column ${step.column + 1} is 0 → swap rows ${step.rows[0] + 1} and ${step.rows[1] + 1}`,
      `Pivot in Spalte ${step.column + 1} ist 0 → Zeilen ${step.rows[0] + 1} und ${step.rows[1] + 1} tauschen`,
    );
  }
  const ij = `${sub(step.i + 1)}${sub(step.j + 1)}`;
  return t(`Eliminate a${ij} with E${ij} (l${ij} = ${step.l})`, `a${ij} eliminieren mit E${ij} (l${ij} = ${step.l})`);
}

function StepBody({ step }: { step: LuStep }) {
  const t = useT();
  if (step.kind === "swap") {
    const [r1, r2] = step.rows;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FracMatrixView m={step.P} label="P" tone={(i) => (i === r1 || i === r2 ? "accent" : undefined)} />
          <FracMatrixView m={step.U} label={t("rows now", "neue Zeilen")} tone={(i) => (i === r1 || i === r2 ? "accent" : undefined)} />
        </div>
        <p className="text-sm text-muted">
          {t(
            "A pivot must not be 0. The permutation matrix P records the swap — what gets decomposed is P·A = L·U. Multipliers already stored in L move along with their rows.",
            "Das Pivotelement darf nicht 0 sein. Die Permutationsmatrix P merkt sich den Tausch — zerlegt wird dann P·A = L·U. Bereits berechnete Faktoren in L wandern mit ihren Zeilen.",
          )}
        </p>
      </div>
    );
  }
  const { i, j, l, E, before, U, L } = step;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <FracMatrixView m={E} label={<>E{sub(i + 1)}{sub(j + 1)}</>} tone={(a, c) => (a === i && c === j ? "accent" : undefined)} />
        <span className="text-muted">·</span>
        <FracMatrixView m={before} tone={(a, c) => (a === i && c === j ? "danger" : a === j && c === j ? "success" : a === i || a === j ? "row" : undefined)} />
        <span className="text-muted">=</span>
        <FracMatrixView m={U} tone={(a, c) => (a === i && c === j ? "success" : a === i ? "row" : undefined)} />
      </div>
      <p className="font-mono text-sm">
        l{sub(i + 1)}{sub(j + 1)} = a{sub(i + 1)}{sub(j + 1)} / a{sub(j + 1)}{sub(j + 1)} = {String(before[i][j])} / {String(before[j][j])} ={" "}
        <strong className="text-accent">{String(l)}</strong> → {t("row", "Zeile")} {i + 1} − {String(l)} · {t("row", "Zeile")} {j + 1}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <FracMatrixView m={L} label={t("L so far", "L bisher")} tone={(a, c) => (a === i && c === j ? "accent" : undefined)} />
        <p className="max-w-sm text-sm text-muted">
          {t(
            `E${sub(i + 1)}${sub(j + 1)} has −l${sub(i + 1)}${sub(j + 1)} at position (${i + 1},${j + 1}). It is undone by L${sub(i + 1)}${sub(j + 1)} with +l${sub(i + 1)}${sub(j + 1)} — that is why the multiplier appears in L with a plus sign.`,
            `E${sub(i + 1)}${sub(j + 1)} hat −l${sub(i + 1)}${sub(j + 1)} an Position (${i + 1},${j + 1}). Rückgängig macht es L${sub(i + 1)}${sub(j + 1)} mit +l${sub(i + 1)}${sub(j + 1)} — deshalb landet der Faktor mit positivem Vorzeichen in L.`,
          )}
        </p>
      </div>
    </div>
  );
}

function SubstitutionBody({
  matrix,
  name,
  rhs,
  rhsName,
  unknown,
  lines,
  formula,
}: {
  matrix: FracMatrix;
  name: string;
  rhs: Fraction[];
  rhsName: string;
  unknown: string;
  lines: string[];
  formula: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <FracMatrixView m={matrix} label={name} />
        <span className="font-serif italic">· {unknown} =</span>
        <FracMatrixView m={col(rhs)} label={rhsName} />
      </div>
      <p className="text-sm text-muted">{formula}</p>
      <ul className="flex flex-col gap-1 font-mono text-sm">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

function QuizCard({ step, onSolved, onWrong }: { step: Extract<LuStep, { kind: "eliminate" }>; onSolved: (firstTry: boolean) => void; onWrong: () => void }) {
  const [value, setValue] = useState("");
  const t = useT();
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState(false);
  const { i, j, before } = step;

  function check() {
    const guess = Fraction.parse(value);
    if (guess && guess.sub(step.l).isZero()) {
      onSolved(tries === 0);
      return;
    }
    if (tries === 0) onWrong();
    setTries((t) => t + 1);
    setHint(true);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-accent/50 bg-accent/5 p-4">
      <p className="font-medium">
        🔮{" "}
        {t(
          `Next step: which multiplier l${sub(i + 1)}${sub(j + 1)} eliminates the entry in row ${i + 1}, column ${j + 1}?`,
          `Nächster Schritt: Welcher Faktor l${sub(i + 1)}${sub(j + 1)} eliminiert den Eintrag in Zeile ${i + 1}, Spalte ${j + 1}?`,
        )}
      </p>
      <FracMatrixView m={before} tone={(a, c) => (a === i && c === j ? "danger" : a === j && c === j ? "success" : undefined)} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono">
          l{sub(i + 1)}
          {sub(j + 1)} =
        </span>
        <input
          autoFocus
          inputMode="text"
          aria-label={t("Multiplier", "Faktor")}
          className={`h-9 w-24 rounded-md border bg-background px-2 text-center font-mono ${tries > 0 ? "border-danger" : "border-border"}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
        />
        <button type="button" className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast" onClick={check}>
          {t("Check", "Prüfen")}
        </button>
        <button type="button" className="text-sm text-muted underline decoration-border underline-offset-2" onClick={() => onSolved(false)}>
          {t("Reveal", "Auflösen")}
        </button>
      </div>
      {hint && (
        <p className="text-sm text-danger">
          {t(
            `Not yet. Hint: l = (entry to eliminate) / (pivot) = ${before[i][j]} / ${before[j][j]}.`,
            `Noch nicht. Tipp: l = (Eintrag, der verschwinden soll) / (Pivot) = ${before[i][j]} / ${before[j][j]}.`,
          )}
        </p>
      )}
    </div>
  );
}

function Theory() {
  const t = useT();
  return (
    <details className="rounded-xl border border-border p-4 text-sm">
      <summary className="cursor-pointer font-semibold">{t("Theory: LU decomposition (SW03)", "Theorie: LR-Zerlegung (SW03)")}</summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
        <li>
          {t(
            <>
              Every elimination step is a multiplication by an elimination matrix E<sub>ij</sub> (identity with −l<sub>ij</sub>{" "}
              at position (i, j)). After all steps: E<sub>32</sub>E<sub>31</sub>E<sub>21</sub>A = U.
            </>,
            <>
              Jeder Eliminationsschritt ist eine Multiplikation mit einer Eliminationsmatrix E<sub>ij</sub> (Einheitsmatrix mit −l
              <sub>ij</sub> an Position (i, j)). Nach allen Schritten gilt E<sub>32</sub>E<sub>31</sub>E<sub>21</sub>A = U.
            </>,
          )}
        </li>
        <li>
          {t(
            <>
              Hence A = (E<sub>32</sub>E<sub>31</sub>E<sub>21</sub>)<sup>−1</sup>U = L·U. The inverse L<sub>ij</sub> of a step
              turns −l<sub>ij</sub> into +l<sub>ij</sub>; in L every multiplier l<sub>ij</sub> sits in row i, column j.
            </>,
            <>
              Daraus folgt A = (E<sub>32</sub>E<sub>31</sub>E<sub>21</sub>)<sup>−1</sup>U = L·U. Die Inverse L<sub>ij</sub>{" "}
              eines Schritts erhält man, indem man −l<sub>ij</sub> in +l<sub>ij</sub> umwandelt; in L steht jeder Faktor l
              <sub>ij</sub> in Zeile i, Spalte j.
            </>,
          )}
        </li>
        <li>
          {t(
            "If a pivot is 0, rows are swapped: decompose P·A = L·U — and swap b to P·b as well.",
            "Ist ein Pivot 0, werden Zeilen vertauscht: Man zerlegt P·A = L·U und muss auch b zu P·b vertauschen.",
          )}
        </li>
        <li>
          {t(
            "Ax = b becomes L·y = b (forward substitution, from the top) and U·x = y (back substitution, from the bottom).",
            "Ax = b wird zu L·y = b (Vorwärtseinsetzen, von oben) und U·x = y (Rückwärtseinsetzen, von unten).",
          )}
        </li>
        <li>
          {t(
            "Advantage: for many right-hand sides b with the same matrix A you decompose only once — every further solve is cheap.",
            "Vorteil: Für viele rechte Seiten b mit derselben Matrix A muss nur einmal zerlegt werden — danach ist jedes Lösen billig.",
          )}
        </li>
      </ul>
    </details>
  );
}
