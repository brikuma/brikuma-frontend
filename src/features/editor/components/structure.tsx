import { Eye, EyeOff, LockKeyhole, UnlockKeyhole, Layers3 } from "lucide-react";
import type { Model } from "@/core/model/public";
export function Structure({
  model,
  hidden,
  selected,
  onSelect,
  onVisibility,
  onProtection,
}: {
  model: Model;
  hidden: readonly string[];
  selected: string | null;
  onSelect: (id: string) => void;
  onVisibility: (groupId: string) => void;
  onProtection: (groupId: string, value: boolean) => void;
}) {
  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        Select a subassembly to inspect its first brick. Visibility does not change the parts count.
      </p>
      <div className="space-y-2">
        {model.groups.map((group) => {
          const parts = model.instances.filter((p) => p.groupId === group.id);
          const active = parts.some((p) => p.id === selected);
          return (
            <div
              key={group.id}
              className={`rounded-md border ${active ? "border-primary bg-primary-muted" : "bg-surface"}`}
            >
              <div className="flex items-center gap-1 pl-3">
                <Layers3 size={15} className="text-muted-foreground" />
                <button
                  className="min-h-11 min-w-0 flex-1 truncate px-2 text-left text-sm font-medium"
                  disabled={!parts.length}
                  onClick={() => onSelect(parts[0].id)}
                  aria-label={`Select ${group.name}`}
                >
                  {group.name}
                  <span className="ml-2 text-xs text-muted-foreground">{parts.length}</span>
                </button>
                <button
                  className="icon-button"
                  onClick={() => onVisibility(group.id)}
                  aria-label={`${hidden.includes(group.id) ? "Show" : "Hide"} ${group.name}`}
                  aria-pressed={!hidden.includes(group.id)}
                >
                  {hidden.includes(group.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                className="flex min-h-9 w-full items-center gap-2 border-t px-3 py-1.5 text-xs text-muted-foreground"
                onClick={() => onProtection(group.id, !group.protected)}
                aria-label={`${group.protected ? "Unprotect" : "Protect"} ${group.name}`}
              >
                {group.protected ? <LockKeyhole size={13} /> : <UnlockKeyhole size={13} />}{" "}
                {group.protected ? "Protected · select to unlock" : "Editable · select to protect"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
