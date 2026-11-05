import FacilityImage from "@/components/FacilityImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import BookingForm from "@/components/BookingForm";
import { isFacility } from "@/lib/facilities";
import { connection } from "next/server";
import { getBackendURL } from "@/lib/backend";


const categoryGuides: Record<string, string> = {
  "Photo Studio": "Planning a portrait session, product shoot, or editorial project? Share your shot list with the studio and confirm the available lighting, backdrops, and setup space before booking.",
  "Film Stage": "For interviews, short films, or commercial shoots, discuss your production schedule and set requirements with the studio. Confirm sound conditions, equipment access, and time for setup and breakdown.",
  "Podcast Lounge": "For a solo recording, conversation, or interview series, confirm the microphone setup, number of recording positions, and recording format with the studio before your session.",
  "Music Suite": "Whether you are planning a rehearsal, recording session, or music project, discuss your instruments and technical requirements with the studio. Confirm which equipment is included and what you need to bring.",
  Workshop: "For a creative workshop or group session, share your activity plan and expected attendance with the studio. Confirm seating, work surfaces, and any materials or equipment your participants will need.",
};

export default async function FacilityDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connection();

  if (!/^[a-f0-9]{24}$/i.test(id)) notFound();
  const response = await fetch(`${getBackendURL()}/facilities/${encodeURIComponent(id)}`, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error(`Unable to load studio (HTTP ${response.status}).`);
  const facility: unknown = await response.json();
  if (!isFacility(facility)) throw new Error("The API returned invalid studio data.");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/facilities" className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-green-700">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to facilities
        </Link>
        <div className="mb-8">
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">{facility.category}</span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">{facility.name}</h1>
          <p className="mt-4 flex items-center gap-2 text-slate-500"><MapPin className="size-4 shrink-0" aria-hidden="true" />{facility.location}</p>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-slate-200 sm:aspect-[2/1]">
          <FacilityImage src={facility.image} alt={facility.name} fill loading="eager" sizes="(max-width: 1152px) 100vw, 1152px" className="object-cover" />
        </div>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_340px]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8" aria-labelledby="about-studio">
            <h2 id="about-studio" className="text-2xl font-bold text-slate-900">About this studio</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-slate-600">{facility.description}</p>
            <p className="mt-4 leading-relaxed text-slate-600">
              {facility.name} is listed as a {facility.category.toLowerCase()} in {facility.location},
              with space for up to {facility.capacity} people. The listed rate is ${facility.pricePerHour} per hour,
              with a security deposit of ${facility.securityDeposit}. Use these details to plan your team size,
              session length, and budget.
            </p>
            <div className="mt-8 flex items-center gap-4 border-t border-slate-100 pt-6">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-green-50 text-green-700"><Users className="size-5" aria-hidden="true" /></span>
              <div><p className="font-semibold text-slate-900">Up to {facility.capacity} people</p><p className="mt-1 text-sm text-slate-500">Maximum studio capacity</p></div>
            </div>
            <div className="mt-8 space-y-7 border-t border-slate-100 pt-7">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Plan your creative session</h3>
                <p className="mt-3 leading-relaxed text-slate-600">
                  {categoryGuides[facility.category] ?? "Share your project requirements with the studio before booking. Confirm the layout, equipment, and facilities you need so you can prepare for your session."}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Location & arrival</h3>
                <p className="mt-3 leading-relaxed text-slate-600">
                  The listed location is {facility.location}. Confirm the exact address, entry instructions,
                  parking, and any accessibility needs with the studio before you travel. Include time for
                  equipment loading and setup when choosing your booking hours.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Rates & booking details</h3>
                <p className="mt-3 leading-relaxed text-slate-600">
                  Studio rental is listed at ${facility.pricePerHour} per hour. The booking form estimates
                  your rental cost from your selected start and end times and adds the listed
                  ${facility.securityDeposit} security deposit. Confirm deposit terms, equipment charges,
                  overtime rates, and cancellation conditions with the studio before finalizing your plans.
                </p>
              </div>
              <div className="rounded-2xl bg-green-50 p-5">
                <h3 className="font-semibold text-green-950">Before you book</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-green-900">
                  <li>Keep your total group within the listed capacity of {facility.capacity} people.</li>
                  <li>Allow time for setup, your session, and packing away.</li>
                  <li>Confirm equipment, amenities, and any studio rules directly with the host.</li>
                  <li>Submit your preferred date and time; availability requires confirmation.</li>
                </ul>
              </div>
            </div>
          </section>
          <BookingForm facility={facility} />
        </div>
      </div>
    </main>
  );
}
