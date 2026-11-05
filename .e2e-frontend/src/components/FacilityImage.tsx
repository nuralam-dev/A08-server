"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const placeholder = "/images/studio-unavailable.svg";

function imageSources(value: string | string[] | undefined) {
  const images = Array.isArray(value) ? value : [value];
  const sources: string[] = [];
  for (const image of images) {
    const source = image?.trim();
    if (!source) continue;
    if (source.startsWith("/") && !source.startsWith("//") && !source.includes("\\")) { sources.push(source); continue; }
    try {
      const url = new URL(source);
      if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) sources.push(url.href);
    } catch {
      // Try the next array entry, then use the local placeholder.
    }
  }
  return [...new Set(sources)];
}

export default function FacilityImage({ src, alt, ...props }: Omit<ImageProps, "src" | "onError" | "unoptimized"> & { src?: string | string[] }) {
  const sources = imageSources(src);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const source = sources.find((candidate) => !failedSources.includes(candidate));
  const unavailable = !source;

  return (
    <Image
      {...props}
      src={source || placeholder}
      alt={unavailable ? `${alt} — image unavailable` : alt}
      // Database image hosts vary. Load directly without changing stored URLs.
      unoptimized={Boolean(source && !source.startsWith("/"))}
      onError={unavailable ? undefined : () => { if (source) setFailedSources((failed) => [...failed, source]); }}
    />
  );
}
