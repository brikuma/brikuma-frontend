"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Box, Images, Sparkles } from "lucide-react";
import { PageHeading, PageFooter } from "@/components/shell/app-shell";
import { ReferencePicker } from "./reference-picker";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export function Brief() {
  const [entry, setEntry] = useState("scratch");
  return (
    <div className="page-wrap max-w-6xl">
      <PageHeading
        eyebrow="A new beginning"
        title="What would you like to build?"
        description="A blank canvas, a spark of inspiration, or a starting point to make your own."
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            id: "scratch",
            name: "Start from scratch",
            description: "Your idea. Your first brick.",
            icon: Box,
          },
          {
            id: "references",
            name: "Use references",
            description: "Collect visual inspiration locally.",
            icon: Images,
          },
          {
            id: "concepts",
            name: "Explore sample concepts",
            description: "Step inside an original study.",
            icon: Sparkles,
          },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setEntry(item.id)}
            aria-pressed={entry === item.id}
            className={`rounded-lg border p-5 text-left ${entry === item.id ? "border-primary bg-primary-muted" : "border-control-border bg-surface"}`}
          >
            <item.icon size={22} className="mb-4 text-primary" />
            <span className="block font-semibold">{item.name}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="min-w-0 space-y-5 rounded-lg border bg-surface p-6">
          <div className="flex items-center gap-3">
            <span className="eyebrow">01</span>
            <h2 className="text-xl">The idea</h2>
          </div>
          <label className="block text-sm font-medium">
            Subject or intent
            <textarea
              className="field mt-2 min-h-24"
              placeholder="A quiet courtyard, a curious creature, a rover for another world…"
            />
          </label>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Visual language
              <select className="field mt-2" defaultValue="Warm and minimal">
                <option>Warm and minimal</option>
                <option>Playful and expressive</option>
                <option>Industrial and precise</option>
                <option>My own direction</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Construction approach
              <select className="field mt-2">
                <option>Stud-based bricks</option>
                <option>Mechanical study (visual preview)</option>
                <option>Mixed construction (future concept)</option>
              </select>
            </label>
          </div>
          <div className="section-rule flex items-center gap-3">
            <span className="eyebrow">02</span>
            <h2 className="text-xl">The boundaries</h2>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Maximum pieces (brief only)
              <input className="field mt-2" type="number" min={1} max={1000} defaultValue={500} />
            </label>
            <label className="text-sm font-medium">
              Approximate footprint
              <select className="field mt-2">
                <option>Desktop · up to 32 × 32 studs</option>
                <option>Shelf · up to 48 × 24 studs</option>
                <option>Open exploration</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">
            Preferred colors
            <input className="field mt-2" placeholder="Ivory, terracotta, a touch of teal" />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Intended use</legend>
            <div className="flex gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="use" defaultChecked /> Display
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="use" /> Play / exploration
              </label>
            </div>
          </fieldset>
          <p className="text-xs text-muted-foreground">
            Your brief is exploratory and stays on this page. It does not generate geometry or
            enforce physical constraints.
          </p>
        </section>
        <aside className="min-w-0 space-y-6">
          <section className="rounded-lg border bg-surface p-6">
            <h2 className="mb-4 text-lg">A reference, not a rule</h2>
            <ReferencePicker />
          </section>
          <div className="border-l-2 border-accent pl-5">
            <p className="eyebrow mb-2">Room to explore</p>
            <p className="text-sm text-muted-foreground">
              Start small. You can add bricks, experiment with color and undo every local edit in
              the workbench.
            </p>
          </div>
        </aside>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-surface p-5">
        <Dialog
          title="Assisted design, in the making"
          description="AI generation is not connected in this frontend preview."
          trigger={
            <Button>
              <Sparkles size={17} />
              About assisted design
            </Button>
          }
        >
          <p className="text-sm">
            The editor contains one pre-authored roof change you can compare, apply and undo.
            Arbitrary text and reference files are never analyzed.
          </p>
          <Link href="/editor/?project=masseria" className="button button-primary mt-5">
            Preview the sample
          </Link>
        </Dialog>
        <Link
          href={entry === "concepts" ? "/editor/?project=masseria" : "/editor/?project=blank"}
          className="button button-primary min-h-11"
        >
          {entry === "concepts" ? "Explore a sample" : "Open blank workspace"}
          <ArrowRight size={18} />
        </Link>
      </div>
      <PageFooter />
    </div>
  );
}
