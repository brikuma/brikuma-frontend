"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, PackageOpen, Check, ShieldQuestion } from "lucide-react";
import { projects } from "@/fixtures/projects";
import counts from "@/fixtures/scene-counts.json";
import { ModelPoster } from "@/components/model-poster";
import { PageHeading, PageFooter } from "@/components/shell/app-shell";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export function Marketplace() {
  const [selected, setSelected] = useState<string | null>(null);
  const project = projects.find((p) => p.id === selected);
  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="The digital model shelf"
        title="Find your next weekend project."
        description="Considered models, clear instructions and a little creative possibility. A preview of a future digital marketplace."
      />
      <div className="mb-8 flex flex-wrap gap-6 border-y py-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <FileText size={17} />
          Digital projects & instructions
        </span>
        <span className="flex items-center gap-2">
          <PackageOpen size={17} />
          Physical bricks are not included
        </span>
        <span className="tag">Fictional listings · no checkout</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {projects.map((item, index) => (
          <article key={item.id} className="overflow-hidden rounded-lg border bg-surface">
            <div className="relative h-64 bg-surface-muted/60">
              <ModelPoster id={item.id} title={item.title} className="h-full" />
              <span className="tag absolute left-4 top-4 bg-surface">
                Digital study {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="p-5">
              <h2 className="text-xl">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.approach} · {counts[item.id]} pieces
              </p>
              <p className="mt-4 text-sm">An original model with a curated instruction preview.</p>
              <div className="mt-6 flex items-center justify-between gap-2 border-t pt-4">
                <span className="text-xs text-muted-foreground">Price to be validated</span>
                <Button onClick={() => setSelected(item.id)}>
                  View example
                  <ArrowUpRight size={15} />
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-10 flex max-w-3xl gap-4 rounded-lg border bg-surface p-6">
        <ShieldQuestion className="shrink-0 text-primary" size={24} />
        <div>
          <h2 className="text-lg">Know what you’re getting.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A future listing should state the included files, model revision, usage rights and
            instruction coverage. Everything in this preview is public demonstration content.
          </p>
        </div>
      </div>
      <Dialog
        open={!!project}
        onOpenChange={(value) => {
          if (!value) setSelected(null);
        }}
        title={project?.title ?? "Listing preview"}
        description="Fictional digital listing. Checkout and purchases are outside this POC."
      >
        {project && (
          <>
            <ModelPoster
              id={project.id}
              title={project.title}
              className="mb-4 h-44 bg-background"
            />
            <p className="text-sm">
              Model revision <span className="font-mono">{project.baselineRevision}</span> ·{" "}
              {counts[project.id]} logical pieces
            </p>
            <h3 className="mt-5 text-base">Example included-file description</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                "Model data — currently bundled demo scene",
                "Instructions — browser layout preview only",
                "Parts list — local demo identifiers and quantities",
              ].map((text) => (
                <li key={text} className="flex gap-2">
                  <Check size={16} className="mt-1 shrink-0 text-primary" />
                  {text}
                </li>
              ))}
            </ul>
            <p className="notice mt-5">
              Illustrative license summary placeholder: intended personal building use. Final
              marketplace terms and project licensing are not approved.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              No physical parts, payment, protected download or purchase is provided.
            </p>
            <Link
              href={`/instructions/?project=${project.id}`}
              className="button button-primary mt-5 w-full"
            >
              View instruction example
            </Link>
          </>
        )}
      </Dialog>
      <PageFooter />
    </div>
  );
}
