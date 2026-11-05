
"use client";

import AccountMenu from "@/components/auth/AccountMenu";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  FaCamera,
  FaHouse,
  FaCalendarDays,
  FaRegSquarePlus,
  FaGear,
  FaXmark,
} from "react-icons/fa6";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const menuItems = [
  {
    name: "My Bookings",
    href: "/dashboard/my-booking",
    icon: FaCalendarDays,
  },
  {
    name: "Add Facility",
    href: "/dashboard/add-facility",
    icon: FaRegSquarePlus,
  },
  {
    name: "Manage Facilities",
    href: "/dashboard/manage-facilities",
    icon: FaGear,
  },
];

export default function Sidebar({
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile background overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-72 flex-col border-r bg-white
          transition-transform duration-300
          lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex h-24 items-center justify-between border-b px-6">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-600 text-white shadow-md">
              <FaCamera size={20} />
            </div>

            <span className="text-2xl font-bold text-slate-900">
              Studio
              <span className="text-green-600">Space</span>
            </span>
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 lg:hidden"
            aria-label="Close sidebar"
          >
            <FaXmark size={22} />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 space-y-8 px-4 py-8">

          {/* Home Link */}
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-4 rounded-xl px-4 py-3 font-medium text-slate-500 transition-colors hover:bg-slate-100"
          >
            <FaHouse size={19} />
            Back to Home
          </Link>

          {/* Management Links */}
          <div>
            <p className="mb-4 px-4 text-xs font-bold tracking-[0.2em] text-slate-400">
              MANAGEMENT
            </p>

            <div className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center gap-4
                      rounded-xl px-4 py-3
                      font-semibold transition-colors
                      ${
                        isActive
                          ? "bg-green-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100"
                      }
                    `}
                  >
                    <Icon size={19} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        <div className="border-t p-4"><AccountMenu loginHref="/login" /></div>
      </aside>
    </>
  );
}
