"use client";

import Link from "next/link";

export default function FacilityError({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">Unable to load this studio</h1>
      <p className="mt-4 text-muted-foreground">Please try again in a moment.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button type="button" onClick={retry} className="rounded-full bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700">Try again</button>
        <Link href="/facilities" className="rounded-full border px-6 py-3 font-medium hover:bg-muted">Back to facilities</Link>
      </div>
    </main>
  );
}
