"use client";
import { useState } from "react";
import { AlertTriangle, Check, CircleDashed, Search } from "lucide-react";
import { PageHeading } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
const tokens = [
  ["Background", "bg-background"],
  ["Surface", "bg-surface"],
  ["Muted", "bg-surface-muted"],
  ["Primary", "bg-primary"],
  ["Accent", "bg-accent"],
  ["Selection", "bg-selection"],
];
export default function Page() {
  const [state, setState] = useState("Empty");
  return (
    <div className="page-wrap max-w-6xl">
      <PageHeading
        eyebrow="The studio toolkit"
        title="Quiet by design. Clear by intention."
        description="A local component and state review. The controls below are explicitly demonstration scenarios."
      />
      <section className="mb-10">
        <h2 className="mb-5 text-xl">01 · A palette with a sense of place</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {tokens.map(([name, className]) => (
            <div key={name}>
              <div className={`h-24 rounded-md border border-control-border ${className}`} />
              <p className="mt-2 text-sm">{name}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mb-10 border-t pt-6">
        <h2 className="mb-5 text-xl">02 · Type, rhythm & controls</h2>
        <p className="text-3xl tracking-tight">Ideas take shape.</p>
        <p className="mt-3 text-muted-foreground">
          System sans fallback · 15/24 body · 4 px spacing rhythm
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => setState("Local success")}>
            Primary action
          </Button>
          <Button onClick={() => setState("Empty")}>Secondary action</Button>
          <Button disabled>Unavailable</Button>
          <Dialog
            title="A focused conversation"
            description="Keyboard focus stays inside. Escape closes this dialog and restores focus."
            trigger={<Button>Open example dialog</Button>}
          >
            <label className="text-sm">
              A sample note
              <input className="field mt-2" placeholder="Try the keyboard focus order" />
            </label>
          </Dialog>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Unavailable is a disabled component example. It does not represent a connected service.
        </p>
        <label className="mt-5 block max-w-md text-sm">
          Example labeled input
          <input className="field mt-2" placeholder="A useful placeholder" />
        </label>
      </section>
      <section className="border-t pt-6">
        <h2 className="mb-5 text-xl">03 · Every state deserves a design</h2>
        <div className="mb-5 flex flex-wrap gap-2">
          {[
            "Empty",
            "No results",
            "Error",
            "Conflict",
            "Quota concept",
            "Local success",
            "Not run",
          ].map((item) => (
            <Button
              key={item}
              onClick={() => setState(item)}
              aria-pressed={state === item}
              variant={state === item ? "primary" : "default"}
            >
              {item}
            </Button>
          ))}
        </div>
        <div
          className={`rounded-lg border p-6 ${state === "Error" ? "bg-danger-muted text-danger" : state === "Conflict" ? "bg-warning-muted text-warning" : state === "Local success" ? "bg-success-muted text-success" : "bg-surface"}`}
          role="status"
        >
          {state === "Local success" ? (
            <Check className="mb-3" />
          ) : state === "Error" || state === "Conflict" ? (
            <AlertTriangle className="mb-3" />
          ) : state === "No results" ? (
            <Search className="mb-3" />
          ) : (
            <CircleDashed className="mb-3" />
          )}
          <h3 className="text-lg">{state}</h3>
          <p className="mt-2 text-sm">
            {
              {
                Empty: "A new workspace. Add your first demo brick.",
                "No results": "No parts match your search. Try a different color.",
                Error:
                  "The preview asset could not be opened. Your model controls remain available.",
                Conflict:
                  "This sample variant belongs to an earlier revision. Undo or view the baseline.",
                "Quota concept":
                  "Future allowance messaging preview. No credits or balances are tracked.",
                "Local success": "A local change was applied. Undo is available.",
                "Not run": "Physical stability has not been assessed.",
              }[state]
            }
          </p>
        </div>
      </section>
    </div>
  );
}
