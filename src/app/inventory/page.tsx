import { Suspense } from "react";
import { Inventory } from "@/features/parts/inventory";
export default function Page() {
  return (
    <Suspense fallback={<div className="page-wrap">Opening inventory…</div>}>
      <Inventory />
    </Suspense>
  );
}
