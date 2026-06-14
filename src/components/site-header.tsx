"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/compare", label: "Compare stays" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-foreground bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="data flex h-7 items-center border-2 border-foreground px-1.5 text-sm font-bold tracking-wider">
            SCT
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-bold uppercase tracking-[0.14em]">
              ScoutStay
            </span>
            <span className="eyebrow text-[0.6rem]">Travel intelligence</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] transition-colors hover:text-foreground",
                pathname === link.href
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
          <Button size="sm" className="ml-2" render={<Link href="/compare" />}>
            New briefing
          </Button>
        </nav>
      </div>
    </header>
  );
}
