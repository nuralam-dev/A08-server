"use client";

import { apiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Facility } from "@/types/facility";
import { CalendarDays, Loader2, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = "/api/backend";
const bookingTimeZone = process.env.NEXT_PUBLIC_BOOKING_TIME_ZONE || "Asia/Dhaka";
function studioMinute() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("sv-SE", {
    timeZone: bookingTimeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
const money = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount,
  );

export default function BookingForm({ facility }: { facility: Facility }) {
  const router = useRouter();
  const { data: currentSession, isPending } = authClient.useSession();
  const today = studioMinute().slice(0, 10);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const minutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const duration =
    startTime && endTime ? (minutes(endTime) - minutes(startTime)) / 60 : 0;
  const validDuration = duration > 0;
  const subtotal = validDuration ? duration * facility.pricePerHour : 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    const start = `${date}T${startTime}`;
    if (
      !date || !startTime ||
      start <= studioMinute() ||
      !validDuration
    ) {
      setError(
        "Choose a future date and start time, with an end time after the start time.",
      );
      return;
    }
    const form = event.currentTarget;
    const fields = new FormData(form);
    const guests = Number(fields.get("guests"));
    if (!Number.isSafeInteger(guests) || guests < 1 || guests > facility.capacity) {
      setError(`Choose between 1 and ${facility.capacity} guests.`);
      return;
    }
    setLoading(true);
    try {
      const session = await authClient.getSession();
      if (session.error) throw new Error("Unable to verify your sign-in. Please try again.");
      if (!session.data) {
        router.replace(`/login?next=${encodeURIComponent(`/facilities/${facility._id}`)}`);
        return;
      }
      const response = await fetch(`${API_URL}/facilities/booking`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId: facility._id,
          date,
          startTime,
          endTime,
          guests,
        }),
      });
      if (response.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(`/facilities/${facility._id}`)}`);
        return;
      }
      if (response.status === 404 || response.status === 405) {
        throw new Error(
          "Online booking is not available yet. Please try again later.",
        );
      }
      if (response.status === 409)
        throw new Error(
          "This time slot is unavailable. Please choose another time.",
        );
      if (!response.ok)
        throw await apiError(response, "Your booking could not be saved");
      const result = await response.json();
      if (!result.insertedId && !result._id && !result.booking?._id) {
        throw new Error(
          "The server did not confirm your booking. Please try again.",
        );
      }
      toast.success("Booking request saved!", {
        description: `Your request for ${facility.name} has been received.`,
      });
      form.reset();
      setDate("");
      setStartTime("");
      setEndTime("");
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Unable to submit your booking. Please try again.";
      setError(message);
      toast.error("Booking was not saved", { description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      aria-labelledby="booking-title"
    >
      <p className="text-sm text-slate-500">Hourly rate</p>
      <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
        {money(facility.pricePerHour)}
        <span className="text-base font-normal text-slate-500"> / hour</span>
      </p>
      <h2
        id="booking-title"
        className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-6 text-lg font-semibold text-slate-900"
      >
        <CalendarDays className="size-5 text-green-600" aria-hidden="true" />
        Book this studio
      </h2>
      <form
        onSubmit={handleSubmit}
        className="mt-5 space-y-4"
        aria-describedby={error ? "booking-error" : undefined}
      >
        <fieldset
          disabled={loading || isPending}
          className="min-w-0 space-y-4 disabled:opacity-60"
        >
          <div className="space-y-2">
            <Label htmlFor="booking-name">Full name</Label>
            <Input
              id="booking-name"
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              placeholder="Your full name"
              value={currentSession?.user.name ?? ""}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="booking-email">Email address</Label>
            <Input
              id="booking-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={currentSession?.user.email ?? ""}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="booking-date">Booking date</Label>
            <Input
              id="booking-date"
              name="date"
              type="date"
              min={today}
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="min-w-0"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="booking-start">Start time</Label>
              <Input
                id="booking-start"
                name="startTime"
                type="time"
                required
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="min-w-0"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="booking-end">End time</Label>
              <Input
                id="booking-end"
                name="endTime"
                type="time"
                required
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="min-w-0"
              />
            </div>
          </div>
          {startTime && endTime && !validDuration && (
            <p className="text-sm text-red-600">
              End time must be after start time on the same day.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="booking-guests">Number of guests</Label>
            <Input
              id="booking-guests"
              name="guests"
              type="number"
              required
              defaultValue={1}
              min={1}
              max={facility.capacity}
              step={1}
            />
            <p className="text-xs text-slate-500">
              Maximum {facility.capacity} guests. Times are in the studio time zone
              ({bookingTimeZone}).
            </p>
          </div>
        </fieldset>
        <div
          className="space-y-3 border-t border-slate-100 pt-4 text-sm"
          aria-live="polite"
        >
          <div className="flex justify-between gap-3 text-slate-600">
            <span>
              {validDuration
                ? `${duration.toFixed(2).replace(/\.?0+$/, "")} hours × ${money(facility.pricePerHour)}`
                : "Studio rental"}
            </span>
            <span>{validDuration ? money(subtotal) : "—"}</span>
          </div>
          <div className="flex justify-between gap-3 text-slate-600">
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Security deposit
            </span>
            <span>{money(facility.securityDeposit)}</span>
          </div>
          <div className="flex justify-between gap-3 border-t border-slate-100 pt-3 font-semibold text-slate-900">
            <span>Estimated total</span>
            <span>
              {validDuration ? money(subtotal + facility.securityDeposit) : "—"}
            </span>
          </div>
        </div>
        {error && (
          <p
            id="booking-error"
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {!isPending && !currentSession?.user ? (
          <Button
            render={<Link href={`/login?next=${encodeURIComponent(`/facilities/${facility._id}`)}`} />}
            nativeButton={false} role="link"
            className="h-12 w-full rounded-full bg-green-600 font-semibold text-white hover:bg-green-700"
          >
            Log in to book
          </Button>
        ) : <Button
          type="submit"
          disabled={loading || isPending || !currentSession?.user}
          className="h-12 w-full rounded-full bg-green-600 font-semibold text-white hover:bg-green-700"
        >
          {loading && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          {loading ? "Submitting..." : "Request booking"}
        </Button>}
        <p className="text-center text-xs leading-relaxed text-slate-500">
          No payment is collected here. Availability and final pricing must be
          confirmed by the studio.
        </p>
      </form>
    </aside>
  );
}
