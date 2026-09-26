import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          LIAL <span className="text-muted font-normal">· Linear Algebra Tools</span>
        </Link>
      </div>
    </header>
  );
}
