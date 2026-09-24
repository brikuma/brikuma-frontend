"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-wrap" role="alert">
      <h1 className="mb-4 text-2xl">This view could not be opened.</h1>
      <p className="mb-4">
        Your in-session model may still be available. Try opening the view again.
      </p>
      <button className="button button-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
