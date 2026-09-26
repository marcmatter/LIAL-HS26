import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTool, tools } from "@/tools/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: PageProps<"/tools/[slug]">): Promise<Metadata> {
  const tool = getTool((await params).slug);
  return tool ? { title: tool.title, description: tool.description } : {};
}

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const tool = getTool((await params).slug);
  if (!tool) notFound();
  const ToolComponent = tool.component;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← All tools
      </Link>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">{tool.category}</p>
        <h1 className="text-3xl font-bold tracking-tight">{tool.title}</h1>
        <p className="mt-2 text-muted">{tool.description}</p>
      </header>
      {ToolComponent ? (
        <ToolComponent />
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted">
          This tool is coming soon.
        </div>
      )}
    </div>
  );
}
