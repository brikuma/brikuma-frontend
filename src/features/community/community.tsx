"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MessageSquare, BookOpen, Users, Search } from "lucide-react";
import { projects } from "@/fixtures/projects";
import { ModelPoster } from "@/components/model-poster";
import { PageHeading, PageFooter } from "@/components/shell/app-shell";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export function Community() {
  const [filter, setFilter] = useState("All studies");
  const [approach, setApproach] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const project = projects.find((p) => p.id === selected);
  const filtered = projects.filter(
    (p) =>
      (filter === "All studies" || p.category === filter) &&
      (approach === "all" || p.approach === approach),
  );
  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="The shared workbench"
        title="Good ideas grow in good company."
        description="Discover a construction technique. Follow a thoughtful revision. See your own work from a different angle."
      />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-y py-4">
        <div className="flex flex-wrap gap-2">
          {["All studies", ...new Set(projects.map((p) => p.category))].map((item) => (
            <Button
              key={item}
              variant={item === filter ? "primary" : "quiet"}
              onClick={() => setFilter(item)}
              aria-pressed={filter === item}
            >
              {item}
            </Button>
          ))}
        </div>
        <label>
          <span className="sr-only">Community construction approach</span>
          <select className="field" value={approach} onChange={(e) => setApproach(e.target.value)}>
            <option value="all">All construction approaches</option>
            {projects.map((p) => (
              <option key={p.id}>{p.approach}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
        <Users size={15} />
        Curated fictional projects, identities and comments. No publishing or messaging is
        connected.
      </p>
      <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item, index) => (
          <article key={item.id} className="overflow-hidden rounded-lg border bg-surface">
            <button className="block w-full text-left" onClick={() => setSelected(item.id)}>
              <div className="relative h-64 bg-surface-muted/60">
                <ModelPoster id={item.id} title={item.title} className="h-full" />
                <span className="tag absolute left-4 top-4 bg-surface">{item.category}</span>
              </div>
              <div className="p-5">
                <p className="eyebrow mb-2">Field notes / 0{index + 1}</p>
                <h2 className="flex items-center justify-between gap-3 text-xl">
                  {item.title}
                  <ArrowUpRight size={18} />
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                <div className="mt-5 flex items-center gap-2 border-t pt-4 text-xs">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary-muted font-medium text-primary">
                    {{ masseria: "JR", rover: "MK", creature: "AL", blank: "B" }[item.id]}
                  </span>
                  <span>
                    {
                      {
                        masseria: "Jules Reed",
                        rover: "Morgan Kit",
                        creature: "Alex Linden",
                        blank: "Local builder",
                      }[item.id]
                    }
                    <span className="ml-2 text-muted-foreground">Example author</span>
                  </span>
                </div>
              </div>
            </button>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <p className="notice flex items-center gap-3">
          <Search size={18} />
          No studies match this combination. Choose a different subject or approach.
        </p>
      )}
      <section className="mt-10 grid gap-8 border-t pt-8 md:grid-cols-2">
        <div>
          <p className="eyebrow mb-3">Thoughtful collaboration</p>
          <h2 className="text-2xl">A conversation about the build.</h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Link a question to a brick, a subassembly or a specific instruction step. Make a
            proposed correction clear before changing the model.
          </p>
        </div>
        <div className="rounded-lg border bg-surface p-5">
          <div className="mb-3 flex items-center gap-2 text-sm">
            <MessageSquare size={17} className="text-primary" />
            <span className="font-medium">A useful review</span>
            <span className="tag ml-auto">Example</span>
          </div>
          <p className="text-sm">
            “Could we simplify the roof without losing the courtyard’s proportions?”
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Robin Vale · fictional reviewer · masseria-r1 · Roof
          </p>
          <Button className="mt-4" onClick={() => setSelected("masseria")}>
            View revision-specific review
          </Button>
        </div>
      </section>
      <Dialog
        open={!!project}
        onOpenChange={(value) => {
          if (!value) setSelected(null);
        }}
        title={project?.title ?? "Project study"}
        description="Fictional community detail and revision-specific review preview."
      >
        {project && (
          <>
            <ModelPoster
              id={project.id}
              title={project.title}
              className="mb-5 h-48 rounded-md bg-background"
            />
            <span className="tag">Author · example identity</span>
            <h3 className="mt-4 text-base">Build notes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {project.description} All geometry is original to this preview; connections and
              physical stability have not been tested.
            </p>
            <div className="my-5 border-y py-4">
              <span className="tag">Reviewer · Robin Vale (fictional)</span>
              <p className="mt-3 text-sm">
                {project.id === "masseria"
                  ? "Could the roof be lighter while keeping the facade? Try the pre-authored terrace correction."
                  : "The silhouette reads well. Consider reviewing the main subassembly in the instruction sample."}
              </p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                Anchored to {project.baselineRevision}
              </p>
              <Link
                href={`/editor/?project=${project.id}${project.id === "masseria" ? "&focus=roof" : ""}`}
                className="button mt-3"
              >
                Focus sample object
                <ArrowUpRight size={15} />
              </Link>
            </div>
            <label className="block text-sm font-medium">
              Unsent local comment draft
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="field mt-2 min-h-24"
                placeholder="Capture a thought for yourself…"
              />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              This draft stays on this page. No message is sent and no invitation is created.
            </p>
            <Link href={`/instructions/?project=${project.id}`} className="button mt-4">
              <BookOpen size={16} />
              Read instruction sample
            </Link>
          </>
        )}
      </Dialog>
      <PageFooter />
    </div>
  );
}
