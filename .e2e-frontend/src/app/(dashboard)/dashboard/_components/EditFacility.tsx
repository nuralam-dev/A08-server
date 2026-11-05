"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { readFacilitiesResponse } from "@/lib/facilities";
import type { Facility } from "@/types/facility";
import AddFacilityForm from "./AddFacilityForm";

export default function EditFacility({ id }: { id: string }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;
  const [result, setResult] = useState<{ userId: string; facility?: Facility; error?: string }>();

  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      router.replace(`/login?next=${encodeURIComponent(`/dashboard/edit-facility/${id}`)}`);
      return;
    }
    const ownerId = userId;
    const controller = new AbortController();
    async function load() {
      try {
        // The owner's collection is authoritative; public listings never grant edit access.
        const response = await fetch("/api/backend/facilities/mine", { cache: "no-store", signal: controller.signal });
        const facilities = await readFacilitiesResponse(response);
        const facility = facilities.find((item) => item._id === id);
        if (!controller.signal.aborted) setResult({ userId: ownerId, facility, error: facility ? undefined : "Studio not found in your facilities. You can only edit studios you added." });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ userId: ownerId, error: error instanceof Error ? error.message : "Unable to load studio." });
      }
    }
    void load();
    return () => controller.abort();
  }, [id, userId, isPending, router]);

  if (isPending || !userId || result?.userId !== userId) return <p role="status">Loading your studio…</p>;
  if (!result.facility) return <div className="rounded-2xl border bg-white p-8"><p role="alert">{result.error}</p><Link className="mt-4 inline-block text-green-700 underline" href="/dashboard/manage-facilities">Back to my facilities</Link></div>;
  return <AddFacilityForm key={`${userId}:${id}`} facility={result.facility} returnTo={`/dashboard/edit-facility/${id}`} onSaved={() => router.push("/dashboard/manage-facilities")} onCancel={() => router.push("/dashboard/manage-facilities")} />;
}
