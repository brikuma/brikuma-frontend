"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Plus, Search, SlidersHorizontal, Box } from "lucide-react";
import counts from "@/fixtures/scene-counts.json";
import { projects } from "@/fixtures/projects";
import { ModelPoster } from "@/components/model-poster";
import { PageFooter } from "@/components/shell/app-shell";

export function Workspace() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All projects");
  const models = projects.filter((p) => p.id !== "blank");
  const filtered = models.filter(
    (p) =>
      (filter === "All projects" || p.category === filter) &&
      `${p.title} ${p.description}`.toLowerCase().includes(search.toLowerCase()),
  );
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
          Local browser session
        </span>
      </div>

      <section aria-label="Start a model" className="mb-9 grid gap-3 sm:grid-cols-2">
        <Link
          href="/editor/?project=blank"
          prefetch={false}
          aria-label="Start from scratch"
          className="group flex min-w-0 items-center gap-4 rounded-lg border border-primary/20 bg-surface p-5 transition-colors hover:border-primary/50 hover:bg-primary-muted/30"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Plus size={23} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base">Start from scratch</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              An open canvas and the full part library.
            </p>
          </div>
          <ArrowUpRight size={18} className="ml-auto shrink-0 text-primary" />
        </Link>
        <Link
          href="/new/"
          aria-label="New project"
          className="group flex min-w-0 items-center gap-4 rounded-lg border bg-surface p-5 transition-colors hover:border-control-border hover:bg-background"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-muted text-foreground">
            <SlidersHorizontal size={22} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base">Create a project brief</h2>
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
              Sample projects
            </h2>
            <span className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
              {models.length}
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
          {["All projects", ...new Set(models.map((p) => p.category))].map((category) => (
            <button
              key={category}
              className={`min-h-8 rounded-md px-3 text-xs font-medium transition-colors ${category === filter ? "bg-foreground text-surface" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}`}
              onClick={() => setFilter(category)}
              aria-pressed={category === filter}
            >
              {category}
            </button>
          ))}
          <span className="ml-auto pl-2 text-xs text-muted-foreground">
            Original studies · editable locally
          </span>
        </div>
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
                  <h3 className="text-sm">{project.title}</h3>
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
        {filtered.length === 0 && (
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
          Projects stay in this browser session. Reloading restores the samples.
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
