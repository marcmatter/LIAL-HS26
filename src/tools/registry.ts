import type { ComponentType } from "react";
import DeterminantTool from "./components/DeterminantTool";
import GaussTool from "./components/gauss/GaussTool";
import OperationsTool from "./components/operations/OperationsTool";

export type ToolCategory = "Vectors & Matrices" | "Systems";

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
    slug: "operations",
    title: "Vector & Matrix Operations (3D)",
    description: "Add, scale and multiply vectors and matrices step by step — and see what each operation does in 3D.",
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
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}
