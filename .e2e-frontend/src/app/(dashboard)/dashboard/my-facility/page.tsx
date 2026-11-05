import { Suspense } from "react";
import { requireSession } from "@/lib/require-session";
import ManageFacilities from "../_components/ManageFacilities";

async function ProtectedFacilities() {
  await requireSession("/dashboard/my-facility");
  return <ManageFacilities title="My Facilities" returnTo="/dashboard/my-facility" />;
}

export default function ManageFacilitiesPage() {
  return (
    <Suspense fallback={<p role="status" className="p-6">Loading...</p>}>
      <ProtectedFacilities />
    </Suspense>
  );
}
