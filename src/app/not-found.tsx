import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link href="/" className="text-accent hover:underline">
        Back to all tools
      </Link>
    </div>
  );
}
