"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

import {
  FaArrowRight,
  FaCalendarDays,
  FaClock,
  FaEnvelope,
  FaRotateRight,
  FaUser,
  FaUsers,
  FaTrashCan,
} from "react-icons/fa6";

import { Card, CardContent } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { apiError } from "@/lib/api-error";
import { isBooking } from "@/lib/bookings";
import type { Booking } from "@/types/booking";

const API_URL = "/api/backend";

// Convert 24-hour time to 12-hour time
function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return time;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;

  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}

// Format date without timezone shifting
function formatDate(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function MyBookings() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<{ id: string; userId: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteInProgress = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchBookings() {
      if (isPending) return;
      if (!userId) {
        router.replace("/login?next=%2Fdashboard%2Fmy-booking");
        return;
      }
      try {
        setLoading(true);
        setError("");
        setBookings([]);

        const response = await fetch(`${API_URL}/facilities/booking`, {
          signal: controller.signal,
          cache: "no-store",
          credentials: "include",
        });

        if (response.status === 401) {
          router.replace("/login?next=%2Fdashboard%2Fmy-booking");
          return;
        }
        if (!response.ok) {
          throw await apiError(response, "Unable to load bookings");
        }

        const data: unknown = await response.json();
        if (controller.signal.aborted) return;

        if (!Array.isArray(data) || !data.every(isBooking)) {
          throw new Error("The API returned invalid booking data. Please contact support.");
        }
        setBookings(data);
        setLoadedUserId(userId);
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error("Booking error:", error);
        setError(error instanceof Error ? error.message : "Unable to load bookings. Please try again.");
        setLoadedUserId(userId);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchBookings();

    return () => controller.abort();
  }, [refreshKey, userId, isPending, router]);

  const showLoading = loading || isPending || !userId || loadedUserId !== userId;

  async function deleteBooking() {
    if (!selectedBooking || selectedBooking.userId !== userId || deleteInProgress.current) return;
    const bookingId = selectedBooking.id;
    deleteInProgress.current = true;
    setDeletingId(bookingId);
    try {
      const response = await fetch(`${API_URL}/facilities/booking/${encodeURIComponent(bookingId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.status === 401) {
        toast.error("Please log in to delete your booking.");
        router.replace("/login?next=%2Fdashboard%2Fmy-booking");
        return;
      }
      if (response.status === 403) throw new Error("You can only delete your own bookings.");
      if (response.status === 404) throw new Error("Booking not found. It may already have been deleted.");
      if (!response.ok) throw await apiError(response, "Unable to delete your booking");

      const result = await response.json();
      if (result.acknowledged !== true || result.deletedCount !== 1) {
        throw new Error("The server did not confirm deletion. Please try again.");
      }
      setBookings((current) => current.filter((booking) => booking._id !== bookingId));
      setSelectedBooking(null);
      toast.success("Booking deleted successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete your booking. Please try again.");
    } finally {
      deleteInProgress.current = false;
      setDeletingId(null);
    }
  }

  return (
    <section className="w-full">
      {/* Page Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">My Bookings</h1>

        <p className="mt-2 text-slate-500">
          View and manage your studio reservations
        </p>
      </div>

      {/* Loading Skeleton */}
      {showLoading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} className="p-6">
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="mt-5 h-5 w-full" />
              <Skeleton className="mt-4 h-5 w-3/4" />
              <Skeleton className="mt-4 h-5 w-2/3" />
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {!showLoading && error && (
        <Card>
          <CardContent className="py-14 text-center">
            <h2 className="text-xl font-semibold">Something went wrong</h2>

            <p className="mt-2 text-slate-500">{error}</p>

            <Button
              className="mt-6 bg-green-600 hover:bg-green-700"
              onClick={() => setRefreshKey((value) => value + 1)}
            >
              <FaRotateRight />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!showLoading && !error && bookings.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="flex min-h-[350px] flex-col items-center justify-center text-center">
            <FaCalendarDays className="mb-5 text-5xl text-slate-400" />

            <h2 className="text-xl font-semibold text-slate-800">
              No bookings found
            </h2>

            <p className="mt-2 text-slate-500">
              Start by exploring our creative studios
            </p>

            <Button className="mt-6 bg-green-600 hover:bg-green-700" render={<Link href="/facilities" />} nativeButton={false} role="link">
              Browse Facilities <FaArrowRight />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Booking Cards */}
      {!showLoading && !error && bookings.length > 0 && (
        <>
          <p className="mb-5 text-sm text-slate-500">
            Total Bookings: {bookings.length}
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            {bookings.map((booking) => (
              <Card
                key={booking._id}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <CardContent className="space-y-6 p-6">
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-slate-900">
                      Studio Reservation
                    </h2>

                    <Badge
                      variant="secondary"
                      className="bg-green-50 text-green-700"
                    >
                      {formatDate(booking.date)}
                    </Badge>
                  </div>

                  {/* Booking Information */}
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center gap-3">
                      <FaUser className="text-green-600" />
                      <span className="text-slate-600">{booking.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <FaEnvelope className="text-green-600" />
                      <span className="break-all text-slate-600">
                        {booking.email}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <FaCalendarDays className="text-green-600" />
                      <span className="text-slate-600">
                        {formatDate(booking.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <FaClock className="text-green-600" />
                      <span className="text-slate-600">
                        {formatTime(booking.startTime)}
                        {" - "}
                        {formatTime(booking.endTime)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <FaUsers className="text-green-600" />
                      <span className="text-slate-600">
                        {booking.guests}{" "}
                        {booking.guests === 1 ? "Guest" : "Guests"}
                      </span>
                    </div>
                  </div>

                  {/* Booking ID */}
                  <div className="border-t pt-4">
                    <p className="break-all text-xs text-slate-400">
                      Booking ID: {booking._id}
                    </p>
                  </div>

                  {/* Facility Details Link */}
                  <Button
                    variant="outline"
                    className="w-full border-green-600 text-green-700 hover:bg-green-50"
                    render={<Link href={`/facilities/${booking.facilityId}`} />}
                    nativeButton={false} role="link"
                  >
                    View Studio <FaArrowRight />
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={deletingId !== null}
                    onClick={() => { if (userId) setSelectedBooking({ id: booking._id, userId }); }}
                  >
                    <FaTrashCan aria-hidden="true" />
                    {deletingId === booking._id ? "Deleting..." : "Delete Booking"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
      <AlertDialog
        open={!showLoading && selectedBooking !== null && selectedBooking.userId === userId}
        onOpenChange={(open) => { if (!open && !deleteInProgress.current) setSelectedBooking(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deletingId !== null} onClick={() => void deleteBooking()}>
              {deletingId ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
