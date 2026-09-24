import Link from "next/link";
import { Box, BookOpen, FileText, List } from "lucide-react";
export function ProjectNavigation({
  id,
  active,
}: {
  id: string;
  active: "editor" | "instructions" | "inventory" | "brief";
}) {
  return (
    <nav aria-label="Project navigation" className="project-navigation">
      {[
        { id: "editor", path: "editor", label: "Workbench", icon: Box },
        { id: "brief", path: "new", label: "Project brief", icon: FileText },
        { id: "instructions", path: "instructions", label: "Instructions", icon: BookOpen },
        { id: "inventory", path: "inventory", label: "Parts inventory", icon: List },
      ].map((item) => (
        <Link
          key={item.id}
          href={`/${item.path}/?project=${id}`}
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
