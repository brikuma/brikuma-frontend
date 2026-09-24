import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page-wrap">
      <p className="eyebrow">404 · A missing piece</p>
      <h1 className="my-4 text-3xl">This workspace does not exist.</h1>
      <Link href="/" className="button button-primary">
        Return to workspace
      </Link>
    </div>
  );
}
