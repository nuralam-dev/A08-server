import { Suspense } from "react";
import { requireSession } from "@/lib/require-session";
import EditFacility from "../../_components/EditFacility";

async function ProtectedEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession(`/dashboard/edit-facility/${id}`);
  return <EditFacility id={id} />;
}

export default function EditFacilityPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<p role="status">Loading studio editor…</p>}><ProtectedEditor params={params} /></Suspense>;
}
