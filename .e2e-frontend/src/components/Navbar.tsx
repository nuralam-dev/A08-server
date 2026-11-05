"use client";

import { navLinks } from "@/lib/navigation";
import AccountMenu from "@/components/auth/AccountMenu";
import { AudioLines, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";

export default function Navbar() {
  return (
    <Suspense fallback={<NavbarView pathname="" />}>
      <NavbarWithPathname />
    </Suspense>
  );
}

function NavbarWithPathname() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = `${pathname}${query ? `?${query}` : ""}`;
  return <NavbarView pathname={pathname} loginHref={`/login?next=${encodeURIComponent(returnTo)}`} />;
}

function NavbarView({ pathname, loginHref = "/login" }: { pathname: string; loginHref?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <header
      className="sticky top-0 z-50 border-b border-border/60 bg-background/90 shadow-[0_4px_24px_-16px_rgba(0,0,0,0.18)] backdrop-blur-xl"
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          setIsOpen(false);
          menuButtonRef.current?.focus();
        }
      }}
    >
      <nav aria-label="Main navigation" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
            onClick={() => setIsOpen(false)}
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform motion-safe:group-hover:-rotate-6">
              <AudioLines className="size-5" aria-hidden="true" />
            </span>
            <span className="text-xl font-bold tracking-tight">
              Studio<span className="font-normal text-muted-foreground">Space</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-full border border-border/60 bg-muted/60 p-1 xl:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive(link.href)
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                    : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="ml-auto xl:ml-0">
            <AccountMenu loginHref={loginHref} />
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring xl:hidden"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div id="mobile-navigation" hidden={!isOpen} className="border-t border-border/60 pb-5 pt-4 xl:hidden">
          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Explore StudioSpace
          </p>
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive(link.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {link.name}
                {isActive(link.href) && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
