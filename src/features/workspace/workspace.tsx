"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Search,
  Sparkles,
  SlidersHorizontal,
  Box,
} from "lucide-react";
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
      <div className="mb-7 flex items-center justify-between">
        <p className="eyebrow">Your creative workspace</p>
        <span className="text-xs text-muted-foreground">
          A little imagination. A world of possibilities.
        </span>
      </div>
      <section className="relative mb-10 grid overflow-hidden rounded-lg border bg-surface lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative z-10 p-6 md:p-10 lg:py-12">
          <span className="tag mb-6 bg-primary-muted text-primary">
            <Box size={14} /> From the first brick
          </span>
          <h1 className="max-w-md text-4xl leading-[1.15] tracking-tight md:text-[2.75rem]">
            Create something
            <br />
            worth building<span className="text-accent">.</span>
          </h1>
          <p className="mt-5 max-w-sm text-muted-foreground">
            A place for curious minds and considered models. Start with an idea. Make it your own,
            one brick at a time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/editor/?project=blank"
              prefetch={false}
              className="button button-primary min-h-11"
            >
              <Plus size={18} />
              Start from scratch
            </Link>
            <Link href="/editor/?project=masseria" prefetch={false} className="button min-h-11">
              Explore a sample
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            No account needed. Explore locally in your browser.
          </p>
        </div>
        <div className="viewport-grid relative min-h-64 bg-surface-muted/50 lg:min-h-[380px]">
          <ModelPoster
            id="masseria"
            title="Mediterranean courtyard"
            priority
            className="h-full min-h-64"
          />
          <div className="absolute bottom-5 left-5 border-l-2 border-accent pl-3">
            <p className="text-sm font-medium">A slower kind of architecture.</p>
            <p className="text-xs text-muted-foreground">
              Masseria courtyard · Original sample study
            </p>
          </div>
          <span className="absolute right-5 top-5 font-mono text-xs text-muted-foreground">
            STUDY 001
          </span>
        </div>
      </section>
      <section aria-labelledby="projects-heading">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="projects-heading" className="text-xl">
              On your workbench
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Three starting points. Countless directions.
            </p>
          </div>
          <Link href="/new/" className="button">
            <Plus size={16} />
            New project
          </Link>
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex max-w-full flex-wrap gap-1 rounded-md bg-surface-muted p-1">
            {["All projects", ...new Set(models.map((p) => p.category))].map((category) => (
              <button
                key={category}
                className={`min-h-10 rounded-sm px-3 text-sm ${category === filter ? "bg-surface font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setFilter(category)}
                aria-pressed={category === filter}
              >
                {category}
              </button>
            ))}
          </div>
          <label className="flex min-h-10 items-center gap-2 rounded-md border border-control-border bg-surface px-3">
            <Search size={16} className="text-muted-foreground" />
            <span className="sr-only">Search projects</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a project…"
              className="w-40 bg-transparent text-sm outline-none"
            />
          </label>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {filtered.map((project, index) => (
            <article
              key={project.id}
              className="group min-w-0 overflow-hidden rounded-lg border bg-surface"
            >
              <Link
                href={`/editor/?project=${project.id}`}
                prefetch={false}
                className="block"
                aria-label={`Open ${project.title}`}
              >
                <div className="relative h-56 overflow-hidden bg-surface-muted/70">
                  <ModelPoster
                    id={project.id}
                    title={project.title}
                    className="h-full transition-transform duration-150 group-hover:scale-[1.03] motion-reduce:transform-none"
                  />
                  <span className="absolute left-4 top-4 tag bg-surface/90">
                    {project.category}
                  </span>
                  <span className="absolute bottom-3 right-4 font-mono text-xs text-muted-foreground">
                    0{index + 1}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg">{project.title}</h3>
                    <ArrowUpRight size={19} className="text-primary" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{project.approach}</p>
                  <div className="mt-5 flex justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>{counts[project.id]} pieces · Sample</span>
                    <span>{project.baselineRevision}</span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-control-border py-16 text-center">
            <Search className="mx-auto mb-3 text-muted-foreground" />
            <h3>No projects match yet.</h3>
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
      <section className="mt-10 grid gap-6 border-t pt-8 md:grid-cols-[1fr_1fr]">
        <Link href="/new/" className="flex items-center gap-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary-muted text-primary">
            <SlidersHorizontal size={23} />
          </span>
          <div>
            <h3 className="text-base">Give your idea a brief</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose your subject, materials and constraints.
            </p>
          </div>
          <ArrowRight className="ml-auto shrink-0" size={20} />
        </Link>
        <Link href="/plans/" className="flex items-center gap-5 md:border-l md:pl-6">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-warning-muted text-accent-foreground">
            <Sparkles size={23} />
          </span>
          <div>
            <h3 className="text-base">More room for imagination</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore our free-first, assisted-design concept.
            </p>
          </div>
          <ArrowRight className="ml-auto shrink-0" size={20} />
        </Link>
      </section>
      <PageFooter />
    </div>
  );
}
