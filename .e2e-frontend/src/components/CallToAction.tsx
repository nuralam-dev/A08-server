
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa6";

import { Button } from "@/components/ui/button";

export default function CallToAction() {
  return (
    <section className="bg-green-700 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">

        {/* Heading */}
        <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl lg:text-5xl">
          Ready to Book Your Next Studio?
        </h2>

        {/* Description */}
        <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-green-100 md:text-xl">
          Discover inspiring creative spaces for your
          photography, music, podcast, and film projects.
        </p>

        {/* Browse Facilities Button */}
        <div className="mt-10">
          <Button
        
            className="h-16 rounded-2xl bg-white px-10 text-lg font-bold text-green-700 shadow-lg transition-all hover:bg-green-50 hover:text-green-800"
          >
            <Link href="/facilities">
              Browse Facilities
              <FaArrowRight className="ml-3" />
            </Link>
          </Button>
        </div>

      </div>
    </section>
  );
}
