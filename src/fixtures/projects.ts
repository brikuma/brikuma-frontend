export type ProjectId = "masseria" | "rover" | "creature" | "blank";

export interface ProjectCardData {
  readonly id: ProjectId;
  readonly title: string;
  readonly subtitle: string;
  readonly category: string;
  readonly approach: string;
  readonly description: string;
  readonly preview: string;
  readonly baselineRevision: string;
}

export const projects: readonly ProjectCardData[] = [
  {
    id: "masseria",
    title: "The courtyard house",
    subtitle: "A little piece of Puglia",
    category: "Architecture",
    approach: "Stud-based construction",
    description:
      "Limestone walls, a terracotta roof, and a quiet courtyard. An original Mediterranean study in miniature.",
    preview: "/assets/previews/masseria.svg",
    baselineRevision: "masseria-r1",
  },
  {
    id: "rover",
    title: "Field rover",
    subtitle: "Small wheels. Big curiosity.",
    category: "Vehicles",
    approach: "Mechanical visual study",
    description:
      "An articulated-looking rover with exposed frame details. Visual construction only; no kinematics simulation.",
    preview: "/assets/previews/rover.svg",
    baselineRevision: "rover-r1",
  },
  {
    id: "creature",
    title: "Moss & mischief",
    subtitle: "A curious woodland companion",
    category: "Creatures",
    approach: "Sculptural construction",
    description:
      "A small brick-built woodland creature with expressive eyes and a warm ochre belly.",
    preview: "/assets/previews/creature.svg",
    baselineRevision: "creature-r1",
  },
];

export function parseProjectId(value: string | null | undefined): {
  id: ProjectId;
  invalid: boolean;
} {
  if (value == null || value === "") return { id: "masseria", invalid: false };
  if (value === "masseria" || value === "rover" || value === "creature" || value === "blank")
    return { id: value, invalid: false };
  return { id: "masseria", invalid: true };
}
