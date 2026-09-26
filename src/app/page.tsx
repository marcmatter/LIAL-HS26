import Link from "next/link";
import { tools, type ToolCategory } from "@/tools/registry";

const categories: ToolCategory[] = ["Matrices", "Systems", "Vectors", "Spaces"];

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">Linear Algebra Tools</h1>
        <p className="mt-2 text-muted">Helper tools for the Linear Algebra course. More tools are on the way.</p>
      </section>

      {categories.map((category) => {
        const items = tools.filter((t) => t.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{category}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={`/tools/${tool.slug}`}
                    className="flex h-full flex-col gap-1 rounded-lg border border-border bg-surface p-4 transition hover:border-accent"
                  >
                    <span className="flex items-center justify-between gap-2 font-medium">
                      {tool.title}
                      {!tool.component && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-normal text-muted">
                          Soon
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-muted">{tool.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
