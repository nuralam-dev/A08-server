
"use client";

import { apiError } from "@/lib/api-error";
import { useState, type FormEvent } from "react";
import type { Facility } from "@/types/facility";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Studio categories
const studioCategories = [
  "Photo Studio",
  "Film Stage",
  "Podcast Lounge",
  "Music Suite",
  "Workshop",
];

// Common label style
const labelClass =
  "mb-2 block text-sm font-bold uppercase tracking-wide text-gray-500";

// Common input style
const inputClass =
  "h-12 w-full rounded-2xl border-gray-200 bg-white px-5 text-base text-gray-900 placeholder:text-gray-400 focus-visible:border-green-500 focus-visible:ring-green-500/20";

export default function AddFacilityForm({ facility: initialFacility, onSaved, onCancel, returnTo = "/dashboard/my-facility" }: {
  facility?: Facility;
  returnTo?: string;
  onSaved?: (facility: Facility) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(initialFacility?.category ?? "");

  // Handle form submission
  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (loading) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Get form values
    const facility = Object.fromEntries(formData.entries());

    // Convert number values
    const newFacility = {
      name: String(facility.name ?? "").trim(),
      category: String(facility.category ?? "").trim(),
      image: initialFacility && Array.isArray(initialFacility.image) && String(facility.image ?? "").trim() === initialFacility.image[0]
        ? initialFacility.image
        : String(facility.image ?? "").trim(),
      location: String(facility.location ?? "").trim(),
      pricePerHour: Number(facility.pricePerHour),
      capacity: Number(facility.capacity),
      securityDeposit: Number(facility.securityDeposit),
      description: String(facility.description ?? "").trim(),
    };

    // Simple validation
    if (!newFacility.category) {
      toast.error("Please select a studio category");
      return;
    }

    if (
      !Number.isFinite(newFacility.pricePerHour) ||
      newFacility.pricePerHour <= 0 ||
      !Number.isInteger(newFacility.capacity) ||
      newFacility.capacity <= 0 ||
      !Number.isFinite(newFacility.securityDeposit) ||
      newFacility.securityDeposit < 0
    ) {
      toast.error("Please enter valid numbers");
      return;
    }

    try {
      setLoading(true);

      const session = await authClient.getSession();
      if (session.error) throw new Error("Unable to verify your sign-in");
      if (!session.data) {
        router.replace(`/login?next=${encodeURIComponent(initialFacility ? returnTo : "/dashboard/add-facility")}`);
        return;
      }

      // POST data to Express.js backend
      const response = await fetch(
        `/api/backend/facilities${initialFacility ? `/${encodeURIComponent(initialFacility._id)}` : ""}`,
        {
          method: initialFacility ? "PATCH" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newFacility),
        }
      );

      if (response.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(initialFacility ? returnTo : "/dashboard/add-facility")}`);
        return;
      }
      if (response.status === 403) throw new Error("You can only update facilities you added.");
      if (!response.ok) {
        throw await apiError(response, initialFacility ? "Failed to update facility" : "Failed to add facility");
      }

      const data = await response.json();

      if (initialFacility) {
        if (data.acknowledged !== true || data.matchedCount !== 1) {
          throw new Error("Studio was not found or could not be updated");
        }
        toast.success("Studio updated successfully!");
        onSaved?.({ ...initialFacility, ...newFacility });
        router.refresh();
      } else if (data.acknowledged || data.insertedId) {
        toast.success("Studio added successfully!");
        form.reset();
        setCategory("");
      } else {
        throw new Error("Studio could not be saved");
      }
    } catch (error) {
      console.error("Error:", error);

      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f9fb] px-5 py-10 md:px-10 lg:px-14">

      {/* Page Heading */}
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827] md:text-4xl">
          {initialFacility ? "Update Studio" : "Add New Studio"}
        </h1>

        <p className="mt-3 text-base text-gray-500 md:text-lg">
          {initialFacility ? "Edit your studio details" : "List your creative studio for others to book"}
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full rounded-[30px] border border-gray-200/70 bg-white p-6 md:p-10 lg:p-12">

        <form onSubmit={handleSubmit}>
          <fieldset disabled={loading}>
          <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">

            {/* Studio Name */}
            <div>
              <Label htmlFor="name" className={labelClass}>
                Studio Name *
              </Label>

              <Input
                id="name"
                name="name"
                defaultValue={initialFacility?.name}
                type="text"
                required
                minLength={3}
                maxLength={120}
                placeholder="e.g. Creative Photography Studio"
                className={inputClass}
              />
            </div>

            {/* Studio Category */}
            <div>
              <Label htmlFor="category" className={labelClass}>
                Studio Category *
              </Label>

              <Select
                name="category"
                value={category}
                onValueChange={(value) => setCategory(value ?? "")}
                required
              >
                <SelectTrigger
                  id="category"
                  className={inputClass}
                >
                  <SelectValue
                    placeholder="Select Studio Category"
                  />
                </SelectTrigger>

                <SelectContent>
                  {[...new Set([...studioCategories, ...(initialFacility ? [initialFacility.category] : [])])].map((item) => (
                    <SelectItem
                      key={item}
                      value={item}
                    >
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Image URL */}
            <div>
              <Label htmlFor="image" className={labelClass}>
                Image URL *
              </Label>

              <Input
                id="image"
                name="image"
                defaultValue={Array.isArray(initialFacility?.image) ? initialFacility.image[0] : initialFacility?.image}
                type="url"
                required
                placeholder="https://example.com/studio.jpg"
                aria-describedby="image-hint"
                className={inputClass}
              />
              <p id="image-hint" className="mt-2 text-sm text-gray-500">Use a direct image URL, not a website or image-sharing page.</p>
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="location" className={labelClass}>
                Location *
              </Label>

              <Input
                id="location"
                name="location"
                defaultValue={initialFacility?.location}
                type="text"
                required
                placeholder="e.g. Gulshan, Dhaka"
                className={inputClass}
              />
            </div>

            {/* Hourly Price */}
            <div>
              <Label
                htmlFor="pricePerHour"
                className={labelClass}
              >
                Price Per Hour ($) *
              </Label>

              <Input
                id="pricePerHour"
                name="pricePerHour"
                defaultValue={initialFacility?.pricePerHour}
                type="number"
                required
                min="0.01"
                step="0.01"
                placeholder="50"
                className={inputClass}
              />
            </div>

            {/* Capacity */}
            <div>
              <Label
                htmlFor="capacity"
                className={labelClass}
              >
                Maximum Capacity *
              </Label>

              <Input
                id="capacity"
                name="capacity"
                defaultValue={initialFacility?.capacity}
                type="number"
                required
                min="1"
                step="1"
                placeholder="10"
                className={inputClass}
              />
            </div>

            {/* Security Deposit */}
            <div className="md:col-span-2">
              <Label
                htmlFor="securityDeposit"
                className={labelClass}
              >
                Security Deposit ($) *
              </Label>

              <Input
                id="securityDeposit"
                name="securityDeposit"
                defaultValue={initialFacility?.securityDeposit}
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="100"
                className={inputClass}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <Label
                htmlFor="description"
                className={labelClass}
              >
                Description *
              </Label>

              <Textarea
                id="description"
                name="description"
                defaultValue={initialFacility?.description}
                required
                minLength={10}
                rows={5}
                placeholder="Describe your studio, equipment, and facilities..."
                className="min-h-[145px] resize-y rounded-2xl border-gray-200 px-5 py-4 text-base focus-visible:border-green-500 focus-visible:ring-green-500/20"
              />
            </div>

          </div>

          {/* Submit Button */}
          <div className="mt-12">
            <Button
              type="submit"
              disabled={loading}
              className="h-13 w-full rounded-2xl bg-green-600 px-12 text-lg font-bold text-white shadow-lg shadow-green-100 transition-all hover:bg-green-700 sm:w-auto"
            >
              {loading ? "Saving Studio..." : initialFacility ? "Save Changes" : "Add Studio"}
            </Button>
            {onCancel && <Button type="button" variant="outline" onClick={onCancel} className="mt-3 sm:ml-3">Cancel</Button>}
          </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
