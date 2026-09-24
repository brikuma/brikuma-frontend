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
      <header className="app-header flex items-center justify-between gap-3 border-b bg-surface px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
            aria-label="BRIKUMA workspace"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-surface">
              <Box size={19} strokeWidth={1.7} />
            </span>
            <span className="text-[15px] font-bold tracking-[-0.04em]">BRIKUMA</span>
          </Link>
          <span className="hidden border-l pl-3 text-xs text-muted-foreground sm:block">
            Design workspace
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            {copy.preview}
          </span>
          <span
            className="hidden size-7 items-center justify-center rounded-md border bg-background text-xs font-semibold sm:flex"
            aria-label="Example local workspace"
          >
            B
          </span>
        </div>
      </header>
      <div className="app-body flex flex-col md:flex-row">
        <aside className="no-print flex shrink-0 items-center justify-between border-b bg-surface px-2 md:w-14 md:flex-col md:justify-start md:border-r md:border-b-0 md:px-1.5 md:py-3">
          <ActiveNavigation
            items={[
              { href: "/", label: "Workspace", icon: <LayoutGrid size={18} /> },
              { href: "/new/", label: "Create", icon: <Plus size={20} /> },
              { href: "/community/", label: "Community", icon: <Users size={18} /> },
              { href: "/marketplace/", label: "Marketplace", icon: <Store size={18} /> },
            ]}
          />
          <Link
            href="/design-system/"
            className="icon-button hidden text-muted-foreground md:mt-auto md:flex"
            aria-label="Component guide"
          >
            <CircleHelp size={18} />
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
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="text-2xl tracking-[-0.035em] md:text-[1.75rem]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
export function PageFooter() {
  return (
    <footer className="mt-10 flex flex-wrap justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
      <p>{copy.disclaimer}</p>
      <Link href="/plans/" className="inline-flex items-center gap-1">
        Explore the product concept <ArrowUpRight size={14} />
      </Link>
    </footer>
  );
}
