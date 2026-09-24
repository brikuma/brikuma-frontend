import { Suspense } from "react";
import { Workbench } from "@/features/editor/workbench";
export default function Page() {
  return (
    <Suspense fallback={<div className="page-wrap">Opening your workbench…</div>}>
      <Workbench />
    </Suspense>
  );
}
