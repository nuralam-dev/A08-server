import Link from "next/link";
import { ArrowUpRight, Camera, Clapperboard, Mic2, Music2, Paintbrush } from "lucide-react";

const categories = [
  { name: "Photography", value: "Photo Studio", icon: Camera, detail: "Find your best light" },
  { name: "Film", value: "Film Stage", icon: Clapperboard, detail: "Set your story in motion" },
  { name: "Podcast", value: "Podcast Lounge", icon: Mic2, detail: "Make your voice heard" },
  { name: "Music", value: "Music Suite", icon: Music2, detail: "Create your next sound" },
  { name: "Workshop", value: "Workshop", icon: Paintbrush, detail: "Room to experiment" },
];

export default function PopularStudios() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">Made for your craft</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">A space for every kind of creator.</h2>
        <p className="mt-3 text-slate-500">Choose your craft. Discover a space that feels right.</p>
        <div className="mt-9 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {categories.map(({ name, value, icon: Icon, detail }) => (
            <Link key={value} href={`/facilities?category=${encodeURIComponent(value)}`}
              className="group rounded-2xl border border-slate-200 bg-[#fafbf8] p-5 transition-colors hover:border-green-300 hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-600">
              <div className="flex items-start justify-between"><Icon className="size-7 text-green-700" aria-hidden="true" /><ArrowUpRight className="size-4 text-slate-400 transition-transform motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:translate-x-1" aria-hidden="true" /></div>
              <h3 className="mt-7 font-semibold text-slate-900">{name}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
