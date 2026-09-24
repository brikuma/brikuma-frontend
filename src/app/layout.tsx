import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { SessionProvider } from "@/features/editor/state/session";
import "@/styles/globals.css";
export const metadata: Metadata = {
  title: { default: "BRIKUMA — Ideas take shape", template: "%s · BRIKUMA" },
  description:
    "A creative brick-building workbench. An independent, browser-local frontend preview.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
