import Banner from "@/components/Banner";
import CallToAction from "@/components/CallToAction";
import FeaturedFacilities from "@/components/FeaturedFacilities";
import PopularStudios from "@/components/PopularStudios";
import Testimonials from "@/components/Testimonials";
import WhyChooseStudioSpace from "@/components/WhyChooseStudioSpace";
import { Suspense } from "react";

const page = () => {
  return (
    <div>
      <Banner></Banner>
      <PopularStudios></PopularStudios>
      <Suspense
        fallback={
          <div className="py-20 text-center">
            Loading featured facilities...
          </div>
        }
      >
        <FeaturedFacilities />
      </Suspense>
      <WhyChooseStudioSpace></WhyChooseStudioSpace>
      <Testimonials></Testimonials>
      <CallToAction></CallToAction>
    </div>
  );
};

export default page;
