import Link from "next/link";
import { Box, CircleHelp, LayoutGrid, Plus, Users, Store, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { ActiveNavigation } from "./navigation";
import { copy } from "@/lib/copy";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="fixed left-4 top-2 z-[60] -translate-y-20 rounded-md bg-primary px-4 py-2 text-white focus:translate-y-0"
      >
        Skip to content
      </a>
      <header className="flex h-16 items-center justify-between gap-4 border-b bg-surface px-4 md:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="BRIKUMA workspace"
        >
          <span className="flex size-8 items-center justify-center rounded-sm bg-primary text-white">
            <Box size={23} strokeWidth={1.5} />
          </span>
          <span className="text-lg font-bold tracking-[0.16em]">BRIKUMA</span>
        </Link>
        <span className="hidden text-xs tracking-wide text-muted-foreground md:block">
          IDEAS TAKE SHAPE.
        </span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-accent" />
            {copy.preview}
          </span>
          <span
            className="hidden size-8 items-center justify-center rounded-full bg-primary-muted text-xs font-semibold sm:flex"
            aria-label="Example local workspace"
          >
            B
          </span>
        </div>
      </header>
      <div className="flex min-h-[calc(100dvh-64px)] flex-col md:flex-row">
        <aside className="no-print flex shrink-0 items-center justify-between border-b bg-surface px-3 md:w-16 md:flex-col md:justify-start md:border-r md:border-b-0 md:px-1 md:py-5">
          <ActiveNavigation
            items={[
              { href: "/", label: "Workspace", icon: <LayoutGrid size={20} /> },
              { href: "/new/", label: "Create", icon: <Plus size={22} /> },
              { href: "/community/", label: "Community", icon: <Users size={20} /> },
              { href: "/marketplace/", label: "Marketplace", icon: <Store size={20} /> },
            ]}
          />
          <Link
            href="/design-system/"
            className="icon-button hidden text-muted-foreground md:mt-auto md:flex"
            aria-label="Component guide"
          >
            <CircleHelp size={20} />
          </Link>
        </aside>
        <main id="main" className="min-w-0 flex-1" tabIndex={-1}>
          {children}
        </main>
      </div>
    </>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="text-[1.75rem] tracking-tight md:text-[2rem]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function PageFooter() {
  return (
    <footer className="mt-12 flex flex-wrap justify-between gap-4 border-t pt-5 text-xs text-muted-foreground">
      <p>{copy.disclaimer}</p>
      <Link href="/plans/" className="inline-flex items-center gap-1">
        Explore the product concept <ArrowUpRight size={14} />
      </Link>
    </footer>
  );
}
