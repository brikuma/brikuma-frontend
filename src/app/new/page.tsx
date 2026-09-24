import { Brief } from "@/features/project-brief/brief";
import { Suspense } from "react";
export default function Page() {
  return (
    <Suspense fallback={<div className="page-wrap">Opening your project brief…</div>}>
      <Brief />
    </Suspense>
  );
}
