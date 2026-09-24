import Link from "next/link";
import { Box, BookOpen, List } from "lucide-react";
export function ProjectNavigation({
  id,
  active,
}: {
  id: string;
  active: "editor" | "instructions" | "inventory";
}) {
  return (
    <nav
      aria-label="Project navigation"
      className="flex min-h-11 gap-1 overflow-x-auto border-b bg-surface px-3 md:px-5"
    >
      {[
        { id: "editor", label: "Workbench", icon: Box },
        { id: "instructions", label: "Instructions", icon: BookOpen },
        { id: "inventory", label: "Parts inventory", icon: List },
      ].map((item) => (
        <Link
          key={item.id}
          href={`/${item.id}/?project=${id}`}
          prefetch={false}
          aria-current={active === item.id ? "page" : undefined}
          className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm ${active === item.id ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground"}`}
        >
          <item.icon size={16} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
