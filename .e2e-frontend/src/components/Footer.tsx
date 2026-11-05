"use client";

import { navLinks } from "@/lib/navigation";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaXTwitter,
} from "react-icons/fa6";

import { MdOutlineCameraAlt } from "react-icons/md";
import { HiOutlineArrowRight } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Quick navigation links
// Studio categories
const categories = [
  { name: "Photography Studio", value: "Photo Studio" },
  { name: "Film Studio", value: "Film Stage" },
  { name: "Podcast Room", value: "Podcast Lounge" },
  { name: "Music Studio", value: "Music Suite" },
  { name: "Art Workshop", value: "Workshop" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscriptionMessage, setSubscriptionMessage] = useState("");

  // Handle newsletter form
  const handleSubscribe = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Newsletter backend is not connected yet
    
    setSubscriptionMessage("Newsletter sign-ups are not available yet. Please check back soon.");
  };

  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 pt-14 pb-6 sm:px-6 lg:px-8">

        {/* Main Footer */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand Section */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <MdOutlineCameraAlt className="text-3xl text-green-400" />

              <span className="text-2xl font-bold">
                Studio
                <span className="text-green-400">
                  Space
                </span>
              </span>
            </Link>

            <p className="mt-4 text-sm leading-7 text-slate-400">
              Discover and book inspiring creative spaces
              for photography, filmmaking, podcasting,
              music production, and more.
            </p>

            {/* Social Icons */}
            <div className="mt-6 flex items-center gap-3">

              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="rounded-full border border-slate-700 p-3 transition-colors hover:border-green-400 hover:text-green-400"
              >
                <FaFacebookF size={16} />
              </a>

              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="rounded-full border border-slate-700 p-3 transition-colors hover:border-green-400 hover:text-green-400"
              >
                <FaInstagram size={16} />
              </a>

              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="rounded-full border border-slate-700 p-3 transition-colors hover:border-green-400 hover:text-green-400"
              >
                <FaYoutube size={16} />
              </a>

              <a
                href="https://x.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X"
                className="rounded-full border border-slate-700 p-3 transition-colors hover:border-green-400 hover:text-green-400"
              >
                <FaXTwitter size={16} />
              </a>

            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-5 text-lg font-semibold">
              Quick Links
            </h3>

            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-green-400"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Studio Categories */}
          <div>
            <h3 className="mb-5 text-lg font-semibold">
              Studio Categories
            </h3>

            <ul className="space-y-3">
              {categories.map((category) => (
                <li key={category.value}>
                  <Link
                    href={`/facilities?category=${encodeURIComponent(
                      category.value
                    )}`}
                    className="text-sm text-slate-400 transition-colors hover:text-green-400"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="mb-5 text-lg font-semibold">
              Stay Updated
            </h3>

            <p className="mb-4 text-sm leading-7 text-slate-400">
              Get the latest updates about creative
              studios and new spaces.
            </p>

            <form
              onSubmit={handleSubscribe}
              className="space-y-3"
            >
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
              />

              <Button
                type="submit"
                className="w-full bg-violet-600 text-white hover:bg-violet-700"
              >
                Subscribe
                <HiOutlineArrowRight className="ml-2" />
              </Button>
            </form>
            {subscriptionMessage && <p role="status" className="mt-3 text-sm text-green-300">{subscriptionMessage}</p>}
          </div>

        </div>

        {/* Bottom Footer */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-6 text-center sm:flex-row">

          <p className="text-sm text-slate-400">
            © 2026 StudioSpace.
            All rights reserved.
          </p>

          <div className="flex items-center gap-5">
            <Link
              href="/privacy"
              className="text-sm text-slate-400 hover:text-white"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="text-sm text-slate-400 hover:text-white"
            >
              Terms of Service
            </Link>
          </div>

        </div>
      </div>
    </footer>
  );
}
