"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SessionBadge from "@/components/SessionBadge";

const NAV = [
  { label: "Market", href: "/", match: (p: string) => p === "/" || p.startsWith("/track") },
  { label: "Vibe Check", href: "/dashboard", match: (p: string) => p.startsWith("/dashboard") },
  { label: "Archives", href: "/archive", match: (p: string) => p.startsWith("/archive") },
  { label: "Compare", href: "/compare", match: (p: string) => p.startsWith("/compare") },
  { label: "Booth", href: "/live", match: (p: string) => p.startsWith("/live") },
];

/** Sticky editorial masthead — giant wordmark, mono nav, live session state. */
export default function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background px-6 py-5 sm:px-10 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-end gap-6">
          <Link
            href="/"
            className="text-5xl font-bold leading-none tracking-tighter sm:text-7xl"
          >
            ENCORE
          </Link>
          <span className="hidden pb-1 lg:block">
            <SessionBadge />
          </span>
        </div>
        <nav className="mb-1 flex flex-wrap gap-6 font-mono text-xs uppercase tracking-[0.2em] sm:gap-12">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-primary ${
                item.match(pathname) ? "text-primary" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-3 lg:hidden">
        <SessionBadge />
      </div>
    </header>
  );
}
