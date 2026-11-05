
import {
  FaStar,
} from "react-icons/fa6";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

// Demo testimonials.
// Replace with real customer feedback before publishing.
const testimonials = [
  {
    id: 1,
    name: "Rafi Ahmed",
    role: "Photographer",
    initials: "RA",
    review:
      "StudioSpace makes it easy to explore creative studios. The clean design helps me find spaces for photography projects.",
    color: "bg-green-600",
  },
  {
    id: 2,
    name: "Priya Sharma",
    role: "Podcaster",
    initials: "PS",
    review:
      "I like how the platform organizes studios by category. Finding a suitable podcast space feels simple and convenient.",
    color: "bg-orange-600",
  },
  {
    id: 3,
    name: "Karim Hassan",
    role: "Filmmaker",
    initials: "KH",
    review:
      "A useful platform for discovering photography, film, and music studios. The layout is straightforward and easy to understand.",
    color: "bg-cyan-600",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-green-50 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Heading */}
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
            What Creators Say
          </h2>

          <p className="mt-4 text-base text-slate-500 md:text-lg">
            Illustrative feedback — demo content, not verified customer reviews
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.id}
              className="rounded-3xl border border-slate-100 bg-white shadow-sm"
            >
              <CardContent className="flex h-full flex-col p-7 md:p-8">

                {/* Five Stars */}
                <div
                  className="mb-6 flex gap-2 text-yellow-400"
                  aria-label="5 out of 5 stars"
                >
                  {Array.from({ length: 5 }).map((_, index) => (
                    <FaStar key={index} size={18} />
                  ))}
                </div>

                {/* Review */}
                <p className="mb-8 flex-1 text-base italic leading-8 text-slate-600">
                  &ldquo;{testimonial.review}&rdquo;
                </p>

                {/* User Information */}
                <div className="flex items-center gap-4">

                  {/* Avatar */}
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${testimonial.color}`}
                  >
                    {testimonial.initials}
                  </div>

                  {/* Name and Role */}
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {testimonial.name}
                    </h3>

                    <p className="text-sm text-slate-400">
                      {testimonial.role}
                    </p>
                  </div>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
}
