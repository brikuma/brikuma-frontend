import { Suspense } from "react";
import { Instructions } from "@/features/instructions/instructions";
export default function Page() {
  return (
    <Suspense fallback={<div className="page-wrap">Opening instructions…</div>}>
      <Instructions />
    </Suspense>
  );
}
