
"use client";

import { Suspense, useState, type ReactNode } from "react";
import { FaBars } from "react-icons/fa6";
import Sidebar from "./_components/Sidebar";


interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Fixed Sidebar */}
     
      <Suspense fallback={<div className="fixed inset-y-0 left-0 hidden w-72 border-r bg-white lg:block" aria-label="Loading dashboard navigation" />}>
        <Sidebar
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </Suspense>

      {/* Main Content */}
      <div className="min-w-0 lg:ml-72">
        {/* Mobile Header */}
        <div className="flex items-center gap-4 border-b bg-white p-4 lg:hidden">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open sidebar"
          >
            <FaBars size={22} />
          </button>

          <h2 className="font-semibold">
            StudioSpace Dashboard
          </h2>
        </div>

        {/* Dashboard Page Content */}
        <main className="min-h-screen p-4 sm:p-6 lg:p-10">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
