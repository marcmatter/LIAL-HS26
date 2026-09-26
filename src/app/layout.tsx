import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/SiteHeader";
import PwaStatus from "@/components/pwa/PwaStatus";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LIAL · Linear Algebra Tools",
    template: "%s · LIAL",
  },
  description: "Interactive helper tools for the Linear Algebra course — works offline.",
  applicationName: "LIAL",
  appleWebApp: {
    capable: true,
    title: "LIAL",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted">
            <PwaStatus />
          </div>
        </footer>
      </body>
    </html>
  );
}
