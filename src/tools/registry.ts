import type { ComponentType } from "react";
import { L, type L10n } from "@/lib/i18n/text";
import DeterminantTool from "./components/DeterminantTool";
import GaussTool from "./components/gauss/GaussTool";
import LuTool from "./components/lu/LuTool";
import OperationsTool from "./components/operations/OperationsTool";
import PracticeTool from "./components/practice/PracticeTool";

export type ToolCategory = "practice" | "vectors-matrices" | "systems";

export const categoryLabels: Record<ToolCategory, L10n> = {
  practice: L("Practice", "Üben"),
  "vectors-matrices": L("Vectors & Matrices", "Vektoren & Matrizen"),
  systems: L("Systems", "Gleichungssysteme"),
};

export interface Tool {
  /** URL segment: the tool is served at /tools/<slug>. */
  slug: string;
  title: L10n;
  description: L10n;
  category: ToolCategory;
  component: ComponentType;
}

/**
 * Every tool in the app. To add one:
 *   1. Create a component in src/tools/components/
 *   2. Add an entry here
 */
export const tools: Tool[] = [
  {
    slug: "practice",
    title: L("Practice Arena", "Trainingsarena"),
    description: L(
      "Endless exercises with instant feedback, worked solutions, XP, streaks, sprints and badges.",
      "Unbegrenzt Übungen mit sofortigem Feedback, Lösungswegen, XP, Serien, Sprints und Abzeichen.",
    ),
    category: "practice",
    component: PracticeTool,
  },
  {
    slug: "operations",
    title: L("Vector & Matrix Operations (3D)", "Vektor- & Matrixoperationen (3D)"),
    description: L(
      "Vectors, A + B, Ax, AB, Aᵀ, A⁻¹ and permutation matrices step by step — and what each operation does in 3D.",
      "Vektoren, A + B, Ax, AB, Aᵀ, A⁻¹ und Permutationsmatrizen Schritt für Schritt — und was jede Operation in 3D bewirkt.",
    ),
    category: "vectors-matrices",
    component: OperationsTool,
  },
  {
    slug: "determinant",
    title: L("Determinant", "Determinante"),
    description: L("Compute the determinant of a square matrix.", "Berechne die Determinante einer quadratischen Matrix."),
    category: "vectors-matrices",
    component: DeterminantTool,
  },
  {
    slug: "gaussian-elimination",
    title: L("Gauss-Jordan (interactive)", "Gauss-Jordan (interaktiv)"),
    description: L(
      "Row-reduce a matrix step by step with your own row operations, with undo and redo.",
      "Bringe eine Matrix mit eigenen Zeilenumformungen Schritt für Schritt auf Stufenform — mit Rückgängig und Wiederholen.",
    ),
    category: "systems",
    component: GaussTool,
  },
  {
    slug: "lu-decomposition",
    title: L("LU Decomposition", "LR-Zerlegung"),
    description: L(
      "PA = LU step by step with elimination matrices, then solve Ax = b by forward and back substitution.",
      "PA = LU Schritt für Schritt mit Eliminationsmatrizen, danach Ax = b durch Vorwärts- und Rückwärtseinsetzen lösen.",
    ),
    category: "systems",
    component: LuTool,
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}
