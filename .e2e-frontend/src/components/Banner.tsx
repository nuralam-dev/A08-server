"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Camera, Mic2, Music2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const slides = [
  {
    id: 1,
    label: "A space for your next big idea",
    title: "Great ideas deserve",
    accent: "a great space.",
    description: "From the first take to the final frame. Find inspiring studios that bring your creative vision to life.",
    image: "/images/studio-1.jpg",
    alt: "Creative studio interior with professional equipment",
    category: "Photography studio",
    detail: "Find your light. Make your mark.",
  },
  {
    id: 2,
    label: "Set the scene for something special",
    title: "Your vision.",
    accent: "Your next stage.",
    description: "Record, shoot, and create in spaces designed for your craft. Discover the setting for something extraordinary.",
    image: "/images/studio-2.jpg",
    alt: "Studio space ready for a creative production",
    category: "Creative production",
    detail: "A fresh setting for your next story.",
  },
  {
    id: 3,
    label: "Turn your space into possibility",
    title: "Open your doors.",
    accent: "Inspire creators.",
    description: "Have a space worth sharing? Connect your studio with photographers, musicians, and the next wave of creative talent.",
    image: "/images/studio-3.jpg",
    alt: "Creative space available for studio bookings",
    category: "Spaces for creators",
    detail: "More possibilities. Under one roof.",
  },
];

const categories = [
  { name: "Photography", icon: Camera },
  { name: "Podcast", icon: Mic2 },
  { name: "Music", icon: Music2 },
];

export default function Banner() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const updateSlide = () => setCurrent(api.selectedScrollSnap());
    updateSlide();
    api.on("select", updateSlide);
    api.on("reInit", updateSlide);
    return () => {
      api.off("select", updateSlide);
      api.off("reInit", updateSlide);
    };
  }, [api]);

  return (
    <section aria-label="Discover your creative space" className="bg-background px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <Carousel
        setApi={setApi}
        opts={{ loop: true }}
        aria-label="Featured studio spaces"
        className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#141c19] text-white sm:rounded-[2rem]"
      >
        <CarouselContent className="ml-0">
          {slides.map((slide, index) => (
            <CarouselItem key={slide.id} className="pl-0" aria-label={`${index + 1} of ${slides.length}`} inert={current !== index}>
              <div className="relative isolate flex min-h-[570px] flex-col justify-between px-6 pb-24 pt-7 sm:px-10 sm:pt-8 lg:min-h-[530px] lg:px-14 lg:pt-10">
                <div className="absolute inset-0 -z-20 lg:left-[36%]">
                  <Image
                    src={slide.image}
                    alt={slide.alt}
                    fill
                    preload={index === 0}
                    sizes="(max-width: 1024px) 100vw, 850px"
                    className="object-cover"
                  />
                </div>
                <div className="absolute inset-0 -z-10 bg-linear-to-r from-[#141c19] via-[#141c19]/90 to-[#141c19]/15" />
                <div className="absolute inset-0 -z-10 bg-linear-to-t from-[#141c19] via-transparent to-[#141c19]/10" />

                <div className="max-w-2xl">
                  <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 backdrop-blur-md">
                    <span className="size-1.5 rounded-full bg-lime-300" aria-hidden="true" />
                    <span className="text-[10px] font-medium tracking-[0.14em] text-white/85 uppercase sm:text-xs">{slide.label}</span>
                  </div>
                  <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                    {slide.title}
                    <span className="mt-1 block text-lime-300">{slide.accent}</span>
                  </h1>
                  <p className="mt-4 max-w-md text-base leading-relaxed text-white/65 sm:text-lg">{slide.description}</p>

                  <div className="mt-6 flex flex-col gap-3 min-[400px]:flex-row">
                    <Link
                      href="/facilities"
                      className="group inline-flex min-h-12 items-center justify-center gap-5 rounded-full bg-lime-300 px-6 text-sm font-semibold text-[#141c19] outline-none transition-colors hover:bg-lime-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#141c19]"
                    >
                      Explore Studios <ArrowUpRight className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5" aria-hidden="true" />
                    </Link>
                    <Link
                      href="/dashboard/add-facility"
                      className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-white/25 bg-white/5 px-6 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300"
                    >
                      List Your Studio <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                <div className="mt-6 flex items-end justify-between gap-6">
                  <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-white/60 sm:gap-x-6">
                    {categories.map(({ name, icon: Icon }) => (
                      <span key={name} className="inline-flex items-center gap-2">
                        <Icon className="size-4 text-lime-300/80" aria-hidden="true" />{name}
                      </span>
                    ))}
                  </div>
                  <div className="hidden max-w-64 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl lg:block">
                    <ArrowDownRight className="mb-3 size-6 text-lime-300" aria-hidden="true" />
                    <p className="text-sm font-semibold">{slide.category}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/65">{slide.detail}</p>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <div className="absolute inset-x-6 bottom-6 flex items-center justify-between border-t border-white/15 pt-5 sm:inset-x-10 lg:inset-x-14">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium tabular-nums text-white/80" aria-live="polite" aria-atomic="true">0{current + 1}<span className="mx-2 text-white/30">/</span>0{slides.length}</span>
            <div className="flex gap-1">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => api?.scrollTo(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={current === index ? "true" : undefined}
                  className="flex h-8 w-8 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
                >
                  <span className={`h-1 rounded-full transition-all motion-reduce:transition-none ${current === index ? "w-8 bg-lime-300" : "w-3 bg-white/30"}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => api?.scrollPrev()} aria-label="Previous slide" className="flex size-10 items-center justify-center rounded-full border border-white/25 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300">
              <ArrowRight className="size-4 rotate-180" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => api?.scrollNext()} aria-label="Next slide" className="flex size-10 items-center justify-center rounded-full border border-white/25 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300">
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </Carousel>
    </section>
  );
}
