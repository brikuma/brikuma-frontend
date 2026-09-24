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
      className="flex w-full justify-around gap-1 md:flex-col md:items-center md:gap-1.5"
    >
      {items.map((item) => {
        const path = pathname.replace(/\/$/, "");
        const active =
          path === item.href.replace(/\/$/, "") ||
          (item.href === "/" && ["/editor", "/instructions", "/inventory"].includes(path));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.label}
            className="app-navigation-link"
          >
            {item.icon}
            <span className="md:sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
