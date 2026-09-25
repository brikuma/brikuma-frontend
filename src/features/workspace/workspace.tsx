"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Plus, Search, SlidersHorizontal, Box } from "lucide-react";
import counts from "@/fixtures/scene-counts.json";
import { projects } from "@/fixtures/projects";
import { ModelPoster } from "@/components/model-poster";
import { PageFooter } from "@/components/shell/app-shell";
import { useSessionSummaries } from "@/features/editor/state/session";
import { useProjectContextSummaries } from "@/features/project-brief/project-context";

export function Workspace() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All projects");
  const sessions = useSessionSummaries();
  const contexts = useProjectContextSummaries();
  const activeIds = new Set([...sessions.map((p) => p.id), ...contexts.map((p) => p.id)]);
  const active = [...activeIds].map((id) => {
    const session = sessions.find((p) => p.id === id);
    const context = contexts.find((p) => p.id === id);
    const sample = projects.find((p) => p.id === (session?.modelId ?? id));
    return {
      id,
      title: session?.title ?? sample?.title ?? "Untitled exploration",
      category: sample?.category ?? "Free-form",
      description: sample?.description ?? "",
      session,
      context,
    };
  });
  const blank = active.find((p) => p.id === "blank");
  const blankAction = blank
    ? blank.session
      ? "Continue your model"
      : "Continue your brief"
    : "Start from scratch";
  const blankHref = blank && !blank.session ? "/new/?project=blank" : "/editor/?project=blank";
  const models = projects.filter((p) => p.id !== "blank");
  const matches = (category: string, text: string) =>
    (filter === "All projects" || category === filter) &&
    text.toLowerCase().includes(search.trim().toLowerCase());
  const filteredActive = active.filter((p) =>
    matches(p.category, `${p.title} ${p.description} ${p.context?.subject ?? ""}`),
  );
  const available = models.filter((p) => !activeIds.has(p.id));
  const filtered = available.filter((p) => matches(p.category, `${p.title} ${p.description}`));
  const categories = [
    "All projects",
    ...new Set([...active.map((p) => p.category), ...models.map((p) => p.category)]),
  ];
  return (
    <div className="page-wrap">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] tracking-[-0.035em]">Your workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A blank canvas. An original study. Your next starting point.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Browser workspace
        </span>
      </div>

      <section aria-label="Start a model" className="mb-9 grid gap-3 sm:grid-cols-2">
        <Link
          href={blankHref}
          prefetch={false}
          aria-label={blankAction}
          className="group flex min-w-0 items-center gap-4 rounded-lg border border-primary/20 bg-surface p-5 transition-colors hover:border-primary/50 hover:bg-primary-muted/30"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            {blank ? (
              <ArrowRight size={23} strokeWidth={1.75} />
            ) : (
              <Plus size={23} strokeWidth={1.75} />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="text-base">{blankAction}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {blank
                ? "Pick up where you left off in this browser."
                : "An open canvas and the full part library."}
            </p>
          </div>
          <ArrowUpRight size={18} className="ml-auto shrink-0 text-primary" />
        </Link>
        <Link
          href={blank ? "/new/?project=blank" : "/new/"}
          aria-label={blank ? "Edit project brief" : "New project"}
          className="group flex min-w-0 items-center gap-4 rounded-lg border bg-surface p-5 transition-colors hover:border-control-border hover:bg-background"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-muted text-foreground">
            <SlidersHorizontal size={22} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base">{blank ? "Edit project brief" : "Create a project brief"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Define your idea, materials and constraints.
            </p>
          </div>
          <ArrowUpRight size={18} className="ml-auto shrink-0 text-muted-foreground" />
        </Link>
      </section>

      <section aria-labelledby="projects-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 id="projects-heading" className="text-base">
              Projects
            </h2>
            <span className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
              {active.length + available.length}
            </span>
          </div>
          <label className="flex min-h-9 max-w-full items-center gap-2 rounded-md border border-control-border bg-surface px-2.5 focus-within:border-primary">
            <Search size={14} className="shrink-0 text-muted-foreground" />
            <span className="sr-only">Search projects</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="w-44 min-w-0 bg-transparent text-xs outline-none"
            />
          </label>
        </div>
        <div className="mb-5 flex max-w-full flex-wrap items-center gap-1 border-b pb-3">
          {categories.map((category) => (
            <button
              key={category}
              className={`min-h-8 rounded-md px-3 text-xs font-medium transition-colors ${category === filter ? "bg-foreground text-surface" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}`}
              onClick={() => setFilter(category)}
              aria-pressed={category === filter}
            >
              {category}
            </button>
          ))}
        </div>
        {filteredActive.length > 0 && (
          <section aria-labelledby="continue-heading" className="mb-8">
            <h3 id="continue-heading" className="mb-2 text-base">
              Continue working
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Local work belongs to this browser and site address. Check the save status in your
              project and download a backup to keep a separate copy of its model, guide, brief and
              reference images.
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredActive.map((project) => (
                <Link
                  key={project.id}
                  href={`/${project.session ? "editor" : "new"}/?project=${project.id}`}
                  prefetch={false}
                  aria-label={`${project.session ? "Resume" : "Continue brief for"} ${project.title}`}
                  className="group min-w-0 rounded-lg border border-primary/25 bg-surface p-4 transition-colors hover:border-primary"
                >
                  <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{project.category} · Local project</span>
                    <ArrowUpRight size={16} className="shrink-0 text-primary" />
                  </div>
                  <h4 className="break-words text-sm">{project.title}</h4>
                  {project.context?.subject && (
                    <p className="mt-2 line-clamp-2 break-words text-xs text-muted-foreground">
                      {project.context.subject}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {project.session ? (
                      <>
                        <span className="flex items-center gap-1.5 tabular-nums">
                          <Box size={13} />
                          {project.session.count.toLocaleString("en")}{" "}
                          {project.session.count === 1 ? "piece" : "pieces"}
                        </span>
                        <span className="min-w-0 break-all">{project.session.revision}</span>
                      </>
                    ) : (
                      <span>Brief in progress · model not opened</span>
                    )}
                    {Boolean(project.context?.referenceCount) && (
                      <span>{project.context?.referenceCount} reference files</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
        {filtered.length > 0 && <h3 className="mb-4 text-base">Sample projects</h3>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <article
              key={project.id}
              className="group min-w-0 overflow-hidden rounded-lg border bg-surface transition-colors hover:border-control-border"
            >
              <Link
                href={`/editor/?project=${project.id}`}
                prefetch={false}
                className="block h-full"
                aria-label={`Open ${project.title}`}
              >
                <div className="relative aspect-[4/3] overflow-hidden border-b bg-background">
                  <ModelPoster
                    id={project.id}
                    title={project.title}
                    priority={project.id === "masseria"}
                    className="h-full p-4 transition-transform duration-150 group-hover:scale-[1.025] motion-reduce:transform-none"
                  />
                  <span className="absolute left-3 top-3 rounded-sm bg-surface/95 px-2 py-1 text-xs font-medium text-muted-foreground">
                    {project.category}
                  </span>
                  <span className="absolute bottom-3 right-3 flex size-7 items-center justify-center rounded-md border bg-surface text-muted-foreground group-hover:text-primary">
                    <ArrowUpRight size={15} />
                  </span>
                </div>
                <div className="p-4">
                  <h4 className="text-sm">{project.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{project.approach}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 tabular-nums">
                      <Box size={13} /> {counts[project.id].toLocaleString("en")} pieces
                    </span>
                    <span>Sample · {project.baselineRevision}</span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
        {filtered.length === 0 && filteredActive.length === 0 && (
          <div className="rounded-lg border border-dashed border-control-border bg-surface py-14 text-center">
            <Search className="mx-auto mb-3 text-muted-foreground" size={24} />
            <h3 className="text-base">No projects match yet.</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another subject or clear your search.
            </p>
            <button
              className="button mt-4"
              onClick={() => {
                setSearch("");
                setFilter("All projects");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-surface px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Browser storage can be cleared or unavailable. Download a project backup from the
          workbench to keep a separate copy; no cloud storage is connected.
        </p>
        <Link
          href="/community/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary"
        >
          Explore the community concept <ArrowRight size={14} />
        </Link>
      </div>
      <PageFooter />
    </div>
  );
}
