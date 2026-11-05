export default function LoadingFacility() {
  return (
    <main className="mx-auto w-full max-w-6xl animate-pulse px-4 py-12" aria-label="Loading studio details" role="status">
      <span className="sr-only">Loading studio details...</span>
      <div className="mb-5 h-5 w-32 rounded bg-slate-200" />
      <div className="mb-8 h-12 w-2/3 rounded bg-slate-200" />
      <div className="aspect-[4/3] rounded-3xl bg-slate-200 sm:aspect-[2/1]" />
      <div className="mt-8 h-48 rounded-3xl bg-slate-200" />
    </main>
  );
}
