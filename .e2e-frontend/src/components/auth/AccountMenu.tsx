"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, ChevronDown, LogOut, Settings, SquarePlus } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const accountLinks = [
  { label: "My Bookings", href: "/dashboard/my-booking", icon: CalendarDays },
  { label: "Add Facility", href: "/dashboard/add-facility", icon: SquarePlus },
  { label: "Manage Facilities", href: "/dashboard/manage-facilities", icon: Settings },
];

export default function AccountMenu({ loginHref }: { loginHref: string }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message || "Unable to log out");
      router.replace("/");
      router.refresh();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (isPending) {
    return <div role="status" aria-label="Loading account" className="h-12 w-24 animate-pulse rounded-2xl bg-slate-100 sm:w-40" />;
  }

  if (!session?.user) {
    return (
      <Button className="h-11 gap-2 rounded-full px-5 font-semibold" render={<Link href={loginHref} />} nativeButton={false} role="link">
        Login <ArrowUpRight className="size-4" aria-hidden="true" />
      </Button>
    );
  }

  const { user } = session;
  const name = user.name?.trim() || user.email;
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${name}`}
        className="group flex h-14 max-w-64 cursor-pointer items-center gap-3 rounded-2xl border border-transparent bg-slate-50 px-3 text-slate-700 outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-green-600 data-popup-open:border-green-600 data-popup-open:ring-2 data-popup-open:ring-green-600 sm:px-4"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-semibold text-white" aria-hidden="true">{initials}</span>
        <span className="hidden truncate text-base font-medium sm:block">{name}</span>
        <ChevronDown className="size-4 shrink-0 transition-transform group-data-popup-open:rotate-180" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="w-72 max-w-[calc(100vw-2rem)] rounded-[22px] bg-white p-0 text-slate-700 shadow-xl ring-1 ring-slate-200/70">
        <div className="px-6 py-5">
          <p className="text-sm text-slate-500">Signed in as</p>
          <p className="mt-1 truncate text-base font-semibold text-slate-800" title={user.email}>{user.email}</p>
        </div>
        <DropdownMenuSeparator className="mx-0 my-0 bg-slate-100" />
        <DropdownMenuGroup className="py-2">
          {accountLinks.map(({ label, href, icon: Icon }) => (
            <DropdownMenuItem key={href} render={<Link href={href} />} className="cursor-pointer gap-4 rounded-none px-6 py-3.5 text-base text-slate-700 focus:bg-slate-50 data-highlighted:bg-slate-50">
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mx-0 my-0 bg-slate-100" />
        <DropdownMenuItem disabled={loggingOut} onClick={handleLogout} variant="destructive" className="cursor-pointer gap-4 rounded-none px-6 py-5 text-base text-red-600 focus:bg-red-50 data-highlighted:bg-red-50">
          <LogOut className="size-5" aria-hidden="true" />
          {loggingOut ? "Logging out..." : "Log Out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
