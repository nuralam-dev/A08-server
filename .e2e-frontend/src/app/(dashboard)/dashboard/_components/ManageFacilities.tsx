"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { readFacilitiesResponse } from "@/lib/facilities";
import { apiError } from "@/lib/api-error";
import FacilityImage from "@/components/FacilityImage";
import type { Facility } from "@/types/facility";

const API_URL = "/api/backend";

interface ManageFacilitiesProps {
  title?: string;
  returnTo?: string;
}

export default function ManageFacilities({ title = "Manage Facilities", returnTo = "/dashboard/manage-facilities" }: ManageFacilitiesProps) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  useEffect(() => {
    if (!isPending && !session) router.replace(`/login?next=${encodeURIComponent(returnTo)}`);
  }, [isPending, session, router, returnTo]);

  if (isPending || !session) return <p role="status" className="p-6">Loading facilities...</p>;
  // Reset all private data and open forms when the signed-in account changes.
  return <UserFacilities key={session.user.id} title={title} returnTo={returnTo} />;
}

function UserFacilities({ title, returnTo }: Required<ManageFacilitiesProps>) {
  const router = useRouter();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Facility | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_URL}/facilities/mine`, {
          signal: controller.signal,
          cache: "no-store",
          credentials: "include",
        });
        if (response.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(returnTo)}`);
          return;
        }
        const data = await readFacilitiesResponse(response);
        if (!controller.signal.aborted) setFacilities(data);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load facilities.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt, router, returnTo]);

  async function deleteFacility(facility: Facility) {
    if (deleting) return;
    setDeleting(facility._id);
    try {
      const response = await fetch(`${API_URL}/facilities/${encodeURIComponent(facility._id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(returnTo)}`);
        return;
      }
      if (response.status === 403) throw new Error("You can only delete facilities you added.");
      if (!response.ok) throw await apiError(response, "Unable to delete studio");
      const result = await response.json();
      if (result.acknowledged !== true || result.deletedCount !== 1) throw new Error("Studio was not found or could not be deleted.");
      setFacilities((current) => current.filter((item) => item._id !== facility._id));
      setConfirmDelete(null);
      toast.success("Studio deleted successfully!");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete studio.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 md:px-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-slate-500">View, update, and delete the studios you have listed.</p>
        </div>
        <Link href="/dashboard/add-facility" className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white">Add Facility</Link>
      </div>
      {loading ? <p role="status">Loading facilities...</p> : error ? (
        <div role="alert" className="space-y-4 rounded-2xl border bg-white p-6">
          <p>{error}</p><Button onClick={() => setAttempt((value) => value + 1)}>Try Again</Button>
        </div>
      ) : facilities.length === 0 ? <div className="rounded-2xl border bg-white p-8 text-center">
        <h2 className="text-xl font-semibold text-slate-900">No facilities added yet.</h2>
        <p className="mt-2 text-slate-500">You haven&apos;t added any facilities. Start by adding your first studio.</p>
        <Button className="mt-5" render={<Link href="/dashboard/add-facility" />} nativeButton={false} role="link">Add Facility</Button>
      </div> : (
        <div className="grid gap-5 xl:grid-cols-2">
          {facilities.map((facility) => (
            <article key={facility._id} className="overflow-hidden rounded-2xl border bg-white p-6 shadow-sm">
              <div className="relative mb-5 aspect-video overflow-hidden rounded-xl bg-slate-100"><FacilityImage src={facility.image} alt={facility.name} fill sizes="(min-width: 1280px) 40vw, 100vw" className="object-cover" /></div>
              <h2 className="text-xl font-bold text-slate-900">{facility.name}</h2>
              <p className="mt-2 text-slate-500">{facility.category} · {facility.location}</p>
              <p className="mt-2 font-semibold">${facility.pricePerHour} / hour · {facility.capacity} guests</p>
              <div className="mt-5 flex gap-3">
                <Button variant="outline" render={<Link href={`/dashboard/edit-facility/${facility._id}`} />} nativeButton={false} role="link" aria-label={`Edit ${facility.name}`}>Edit</Button>
                <Button variant="destructive" disabled={deleting !== null} onClick={() => setConfirmDelete(facility)} aria-label={`Delete ${facility.name}`}>
                  {deleting === facility._id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => { if (!open && !deleting) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete facility?</AlertDialogTitle>
            <AlertDialogDescription>Delete &quot;{confirmDelete?.name}&quot;? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleting !== null} onClick={() => { if (confirmDelete) void deleteFacility(confirmDelete); }}>
              {deleting ? "Deleting..." : "Delete Facility"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
