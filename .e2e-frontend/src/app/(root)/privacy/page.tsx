import Link from "next/link";

export default function Page() {
  return (
    <main className="mx-auto min-h-[50vh] max-w-7xl px-4 py-16">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-4 text-muted-foreground">The privacy policy has not been published yet.</p>
      <Link href="/" className="mt-6 inline-block text-primary underline">
        Back to home
      </Link>
    </main>
  );
}
