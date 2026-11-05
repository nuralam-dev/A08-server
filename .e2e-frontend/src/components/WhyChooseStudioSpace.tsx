
import {
  FaRegCalendarCheck,
  FaShieldHalved,
  FaAward,
} from "react-icons/fa6";

import { Card, CardContent } from "@/components/ui/card";

// Why Choose StudioSpace features
const features = [
  {
    id: 1,
    title: "Easy Booking",
    description:
      "Discover and reserve creative studio spaces for your next project.",
    icon: FaRegCalendarCheck,
    iconColor: "text-green-600",
    iconBg: "bg-green-50",
  },
  {
    id: 2,
    title: "Simple Management",
    description:
      "Manage your studio listings and bookings from one place.",
    icon: FaShieldHalved,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  {
    id: 3,
    title: "Creative Spaces",
    description:
      "Explore photography, film, podcast, and music studios.",
    icon: FaAward,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50",
  },
];

export default function WhyChooseStudioSpace() {
  return (
    <section className="bg-white py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Heading */}
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
            Why Choose StudioSpace?
          </h2>

          <p className="mt-4 text-base text-slate-500 md:text-lg">
            Everything you need for a seamless creative
            studio booking experience
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card
                key={feature.id}
                className="rounded-3xl border border-slate-100 bg-slate-50 shadow-none transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <CardContent className="flex min-h-[250px] flex-col items-center justify-center px-7 py-10 text-center">

                  {/* Feature Icon */}
                  <div
                    className={`mb-7 flex h-20 w-20 items-center justify-center rounded-2xl ${feature.iconBg}`}
                  >
                    <Icon
                      className={`text-4xl ${feature.iconColor}`}
                    />
                  </div>

                  {/* Feature Title */}
                  <h3 className="mb-4 text-xl font-bold text-slate-900 md:text-2xl">
                    {feature.title}
                  </h3>

                  {/* Feature Description */}
                  <p className="max-w-sm text-base leading-7 text-slate-500">
                    {feature.description}
                  </p>

                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
