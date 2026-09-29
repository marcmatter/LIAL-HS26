import type { ComponentType } from "react";
import DeterminantTool from "./components/DeterminantTool";
import GaussTool from "./components/gauss/GaussTool";
import LuTool from "./components/lu/LuTool";
import OperationsTool from "./components/operations/OperationsTool";
import PracticeTool from "./components/practice/PracticeTool";

export type ToolCategory = "Practice" | "Vectors & Matrices" | "Systems";

export interface Tool {
  /** URL segment: the tool is served at /tools/<slug>. */
  slug: string;
  title: string;
  description: string;
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
    title: "Practice Arena",
    description: "Endless exercises with instant feedback, worked solutions, XP, streaks, sprints and badges.",
    category: "Practice",
    component: PracticeTool,
  },
  {
    slug: "operations",
    title: "Vector & Matrix Operations (3D)",
    description: "Vectors, A + B, Ax, AB, Aᵀ, A⁻¹ and permutation matrices step by step — and what each operation does in 3D.",
    category: "Vectors & Matrices",
    component: OperationsTool,
  },
  {
    slug: "determinant",
    title: "Determinant",
    description: "Compute the determinant of a square matrix.",
    category: "Vectors & Matrices",
    component: DeterminantTool,
  },
  {
    slug: "gaussian-elimination",
    title: "Gauss-Jordan (interactive)",
    description: "Row-reduce a matrix step by step with your own row operations, with undo and redo.",
    category: "Systems",
    component: GaussTool,
  },
  {
    slug: "lu-decomposition",
    title: "LU Decomposition (LR-Zerlegung)",
    description: "PA = LU step by step with elimination matrices, then solve Ax = b by forward and back substitution.",
    category: "Systems",
    component: LuTool,
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}
