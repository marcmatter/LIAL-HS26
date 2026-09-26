import type { ComponentType } from "react";
import DeterminantTool from "./components/DeterminantTool";
import GaussTool from "./components/gauss/GaussTool";

export type ToolCategory = "Matrices" | "Vectors" | "Systems" | "Spaces";

export interface Tool {
  /** URL segment: the tool is served at /tools/<slug>. */
  slug: string;
  title: string;
  description: string;
  category: ToolCategory;
  /** Leave undefined for tools that are planned but not built yet. */
  component?: ComponentType;
}

/**
 * Every tool in the app. To add one:
 *   1. Create a component in src/tools/components/
 *   2. Add an entry here (or set `component` on an existing placeholder)
 */
export const tools: Tool[] = [
  {
    slug: "determinant",
    title: "Determinant",
    description: "Compute the determinant of a square matrix.",
    category: "Matrices",
    component: DeterminantTool,
  },
  {
    slug: "matrix-operations",
    title: "Matrix Operations",
    description: "Add, subtract and multiply matrices.",
    category: "Matrices",
  },
  {
    slug: "inverse",
    title: "Inverse",
    description: "Find the inverse of an invertible matrix.",
    category: "Matrices",
  },
  {
    slug: "gaussian-elimination",
    title: "Gauss-Jordan (interactive)",
    description: "Row-reduce a matrix step by step with your own row operations, with undo and redo.",
    category: "Systems",
    component: GaussTool,
  },
  {
    slug: "linear-systems",
    title: "Linear Systems",
    description: "Solve Ax = b and describe the solution set.",
    category: "Systems",
  },
  {
    slug: "vector-operations",
    title: "Vector Operations",
    description: "Dot product, cross product, norms and angles.",
    category: "Vectors",
  },
  {
    slug: "eigenvalues",
    title: "Eigenvalues & Eigenvectors",
    description: "Compute eigenvalues and eigenvectors of a square matrix.",
    category: "Spaces",
  },
  {
    slug: "subspaces",
    title: "Rank, Kernel & Image",
    description: "Find rank, a basis of the null space and column space.",
    category: "Spaces",
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}
