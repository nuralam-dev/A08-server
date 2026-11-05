
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FaMagnifyingGlass } from "react-icons/fa6";
import FacilityCard from "@/components/FacilityCard";
import { Input } from "@/components/ui/input";
import type { Facility } from "@/types/facility";
import { fetchFacilities } from "@/lib/facilities";

export default function AllFacilities() {
  return <Suspense fallback={<p role="status" className="p-12 text-center">Loading studios…</p>}><FacilitiesExplorer /></Suspense>;
}

function FacilitiesExplorer() {
  const params = useSearchParams();
  const router = useRouter();
  const category = params.get("category") || "";
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function getFacilities() {
      try {
        const data = await fetchFacilities(controller.signal);
        setFacilities(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Error fetching facilities:", error);
        setError(error instanceof Error ? error.message : "Unable to load facilities. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    getFacilities();
    return () => controller.abort();
  }, []);

  // Filter facilities by name, category, or location
  const filteredFacilities = facilities.filter((facility) => {
    const searchText = search.trim().toLowerCase();

    return (!category || facility.category === category) && (
      facility.name.toLowerCase().includes(searchText) ||
      facility.category.toLowerCase().includes(searchText) ||
      facility.location.toLowerCase().includes(searchText)
    );
  });

  return (
    <section className="min-h-screen bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Page Heading */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Find your next creative space
          </h1>

          <p className="mt-3 text-slate-500">
            Explore creative studios and find the perfect space
            for your next project.
          </p>
        </div>

        {/* Search Section */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="font-medium text-slate-600">
            {loading
              ? "Loading facilities..."
              : error ? "Facilities unavailable" : `Showing ${filteredFacilities.length} of ${facilities.length} facilities`}
          </p>

          <div className="relative w-full sm:max-w-sm">
            <FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

            <Input
              type="text"
              aria-label="Search facilities"
              placeholder="Search facilities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 rounded-xl bg-white pl-11"
            />
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2" aria-label="Filter by category">
          {["", ...new Set([...facilities.map((facility) => facility.category), ...(category ? [category] : [])])].map((value) => (
            <button key={value} type="button" aria-pressed={category === value}
              onClick={() => router.replace(value ? `/facilities?category=${encodeURIComponent(value)}` : "/facilities", { scroll: false })}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${category === value ? "border-green-700 bg-green-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-green-600 hover:text-green-700"}`}>
              {value || "All spaces"}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse overflow-hidden rounded-2xl border bg-white"
              >
                <div className="h-56 bg-slate-200" />

                <div className="space-y-4 p-5">
                  <div className="h-6 w-3/4 rounded bg-slate-200" />
                  <div className="h-4 w-1/2 rounded bg-slate-200" />
                  <div className="h-4 w-2/3 rounded bg-slate-200" />
                  <div className="h-11 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border bg-white p-12 text-center">
            <p role="alert" className="text-red-600">{error}</p>
          </div>
        )}

        {/* All Facilities Grid */}
        {!loading && !error && filteredFacilities.length > 0 && (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFacilities.map((facility) => (
              <FacilityCard
                key={facility._id}
                facility={facility}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredFacilities.length === 0 && (
          <div className="rounded-2xl border bg-white p-12 text-center">
            <h2 className="text-xl font-semibold text-slate-800">
              No facilities found.
            </h2>

            <p className="mt-2 text-slate-500">
              Try searching for another studio or location.
            </p>
          </div>
        )}

      </div>
    </section>
  );
}
