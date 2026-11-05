import Link from "next/link";

export default function StudioNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">Studio not found</h1>
      <p className="mt-4 text-muted-foreground">This studio may have been removed or the link is incorrect.</p>
      <Link href="/facilities" className="mt-8 inline-flex rounded-full bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700">Back to facilities</Link>
    </main>
  );
}
