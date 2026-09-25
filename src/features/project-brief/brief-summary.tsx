"use client";

import Link from "next/link";
import type { ProjectId } from "@/fixtures/projects";
import { useProjectContext } from "./project-context";

export function ProjectBriefSummary({ projectId }: { projectId: ProjectId }) {
  const { brief } = useProjectContext(projectId);
  return (
    <section className="space-y-3 border-b pb-4" aria-label="Project brief summary">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base">Project brief</h2>
        <Link href={`/new/?project=${projectId}`} className="button text-xs">
          Edit brief
        </Link>
      </div>
      <p className="break-words text-sm">
        {brief.subject || "Describe your idea in the project brief."}
      </p>
      <dl className="space-y-2 text-xs">
        {[
          ["Visual language", brief.visualLanguage],
          ["Construction approach", brief.constructionApproach],
          ["Technique", brief.technique],
          ["Intended use", brief.intendedUse],
          ["Piece limit · brief only", brief.maxPieces || "Not specified"],
          ["Footprint", brief.footprint],
          ["Preferred colors", brief.colors || "Not specified"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        These preferences do not generate geometry, enforce constraints or change the model
        revision. Project backups include the brief and reference images. Check the local save
        status; no cloud copy is connected.
      </p>
    </section>
  );
}
