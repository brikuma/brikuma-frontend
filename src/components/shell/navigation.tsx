"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
export function ActiveNavigation({
  items,
}: {
  items: { href: string; label: string; icon: ReactNode }[];
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Global navigation"
      className="flex w-full justify-around gap-2 md:flex-col md:items-center md:gap-4"
    >
      {items.map((item) => {
        const active = pathname.replace(/\/$/, "") === item.href.replace(/\/$/, "");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.label}
            className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[0.75rem] md:text-xs ${active ? "bg-primary-muted text-primary" : "text-muted-foreground hover:bg-surface-muted"}`}
          >
            {item.icon}
            <span className="md:sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
