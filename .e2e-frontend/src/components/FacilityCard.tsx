
import Link from "next/link";
import FacilityImage from "./FacilityImage";

import {
  FaLocationDot,
  FaUsers,
  FaArrowRight,
} from "react-icons/fa6";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

import type { Facility } from "@/types/facility";

interface FacilityCardProps {
  facility: Facility;
}

export default function FacilityCard({
  facility,
}: FacilityCardProps) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-sm transition-all duration-200 motion-safe:hover:-translate-y-1 hover:shadow-lg">

      {/* Facility Image */}
      <div className="relative h-56 w-full">
        <FacilityImage
          src={facility.image}
          alt={facility.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />

        {/* Category */}
        <Badge className="absolute left-4 top-4 bg-white text-green-700 hover:bg-white">
          {facility.category}
        </Badge>

        {/* Hourly Price */}
        <div className="absolute right-4 top-4 rounded-xl bg-white px-3 py-2 text-sm font-bold text-green-700">
          ${facility.pricePerHour}
          <span className="font-normal text-gray-500">
            /hr
          </span>
        </div>
      </div>

      {/* Card Content */}
      <CardContent className="space-y-4 p-5">
        <h3 className="line-clamp-1 text-xl font-bold text-gray-900">
          {facility.name}
        </h3>

        <div className="space-y-3 text-sm text-gray-500">

          {/* Location */}
          <div className="flex items-center gap-2">
            <FaLocationDot className="text-green-600" />
            <span className="line-clamp-1">
              {facility.location}
            </span>
          </div>

          {/* Capacity */}
          <div className="flex items-center gap-2">
            <FaUsers className="text-green-600" />
            <span>
              Up to {facility.capacity} people
            </span>
          </div>
        </div>

        {/* View Details Button */}
        <Button
          render={<Link href={`/facilities/${facility._id}`} />}
          nativeButton={false} role="link"
          className="w-full bg-green-600 text-white hover:bg-green-700"
        >
            View Details
            <FaArrowRight className="ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
