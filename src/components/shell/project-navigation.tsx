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
    <nav aria-label="Project navigation" className="project-navigation">
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
        >
          <item.icon size={14} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
