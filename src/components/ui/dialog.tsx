"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";

/** Radix owns modal focus, Escape and restoration; composition owns styling. */
export function Dialog({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
  sheet = false,
}: {
  sheet?: boolean;
  trigger?: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/35" />
        <DialogPrimitive.Content
          onOpenAutoFocus={() => {
            if (document.activeElement instanceof HTMLElement)
              opener.current = document.activeElement;
          }}
          onCloseAutoFocus={(event) => {
            if (!trigger && opener.current) {
              event.preventDefault();
              opener.current.focus();
            }
          }}
          className={`pointer-events-auto fixed left-1/2 z-50 max-h-[90dvh] max-w-lg -translate-x-1/2 overflow-y-auto border bg-surface p-6 shadow-xl ${sheet ? "bottom-0 w-full rounded-t-lg sm:bottom-auto sm:top-1/2 sm:w-[calc(100%_-_32px)] sm:-translate-y-1/2 sm:rounded-lg" : "top-1/2 w-[calc(100%_-_32px)] -translate-y-1/2 rounded-lg"}`}
        >
          <DialogPrimitive.Title className="pr-10 text-xl font-semibold">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            {description}
          </DialogPrimitive.Description>
          <DialogPrimitive.Close
            className="icon-button absolute right-3 top-3"
            aria-label="Close dialog"
          >
            <X size={18} />
          </DialogPrimitive.Close>
          <div className="mt-6">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
