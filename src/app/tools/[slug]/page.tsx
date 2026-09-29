import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolHeader } from "@/components/ToolList";
import { getTool, tools } from "@/tools/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: PageProps<"/tools/[slug]">): Promise<Metadata> {
  const tool = getTool((await params).slug);
  return tool ? { title: tool.title.en, description: tool.description.en } : {};
}

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();
  const ToolComponent = tool.component;

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader slug={slug} />
      <ToolComponent />
    </div>
  );
}
