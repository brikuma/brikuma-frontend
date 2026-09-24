import Link from "next/link";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { PageHeading, PageFooter } from "@/components/shell/app-shell";
export function Plans() {
  return (
    <div className="page-wrap max-w-6xl">
      <PageHeading
        eyebrow="More possibilities, at your pace"
        title="A useful beginning. Room to grow."
        description="Free-form building belongs at the heart of BRIKUMA. These provisional plans describe a future direction, not an available subscription."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border bg-surface p-7">
          <p className="eyebrow mb-4">For every curious builder</p>
          <h2 className="text-3xl">Free</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            A meaningful place to begin and keep creating.
          </p>
          <p className="my-6 border-y py-5 text-xl font-medium">Free access is the intention.</p>
          <ul className="space-y-4 text-sm">
            {[
              "Free-form design and local exploration",
              "A useful future AI allowance",
              "Parts views and approachable instruction tools",
              "Community discovery and learning",
            ].map((text) => (
              <li key={text} className="flex gap-3">
                <Check size={17} className="shrink-0 text-primary" />
                {text}
              </li>
            ))}
          </ul>
          <Link href="/editor/?project=blank" className="button mt-8 w-full">
            Explore the local preview
            <ArrowRight size={16} />
          </Link>
        </section>
        <section className="relative rounded-lg border border-primary bg-primary-muted p-7">
          <span className="tag absolute right-5 top-5 bg-surface text-primary">
            <Sparkles size={13} />
            Product concept
          </span>
          <p className="eyebrow mb-4">For a bigger imagination</p>
          <h2 className="text-3xl">Creator</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            More depth for ambitious studies and explorations.
          </p>
          <p className="my-6 border-y border-primary/20 py-5 text-xl font-medium">
            Pricing to be validated
          </p>
          <ul className="space-y-4 text-sm">
            {[
              "Everything intended for Free",
              "Larger future assisted-design allowances",
              "Advanced exploration and variant comparison",
              "Richer project and instruction workflows",
            ].map((text) => (
              <li key={text} className="flex gap-3">
                <Check size={17} className="shrink-0 text-primary" />
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-8 rounded-md border border-primary/30 p-3 text-center text-sm">
            Subscriptions are not connected in this POC.
          </p>
        </section>
      </div>
      <section className="mt-8 flex flex-wrap items-center justify-between gap-5 border-y py-6">
        <div>
          <h2 className="text-lg">Team · a future concept</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Thoughtful collaboration for shared creative work. Scope and pricing remain open.
          </p>
        </div>
        <Link href="/community/" className="button">
          Explore example collaboration
          <ArrowRight size={16} />
        </Link>
      </section>
      <p className="mt-6 text-sm text-muted-foreground">
        No credits are counted or deducted. No billing, entitlement engine or approved allowance is
        implemented.
      </p>
      <PageFooter />
    </div>
  );
}
