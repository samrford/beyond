"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import TripForm from "@/components/TripForm";
import { useTrip, useUpdateTrip } from "@/lib/queries/trips";
import { TripData } from "@/components/TripForm";
import toast from "react-hot-toast";
import PageTransition from "@/components/PageTransition";
import QueryBoundary from "@/components/QueryBoundary";

export default function EditTripPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: trip, isLoading, isError, error, refetch } = useTrip(params.id);
  const updateTrip = useUpdateTrip(params.id);

  useEffect(() => {
    if (trip && !trip.isOwner) {
      router.replace(`/trip/${params.id}`);
    }
  }, [trip, params.id, router]);

  const initialData = trip
    ? {
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        headerPhoto: trip.headerPhoto,
        summary: trip.summary,
        isPublic: trip.isPublic,
      }
    : null;

  const handleSubmit = async (data: TripData) => {
    if (!trip) return;
    try {
      await updateTrip.mutateAsync({
        ...data,
        bgMode: trip.bgMode,
        bgBlur: trip.bgBlur,
        bgOpacity: trip.bgOpacity,
        bgDarkness: trip.bgDarkness,
      });
      toast.success("Trip updated!");
      router.push(`/trip/${params.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update trip");
    }
  };

  if (isLoading || isError || !trip) {
    return (
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        loadingMessage="Preparing trip details..."
        notFound={!isLoading && !isError && !trip}
        notFoundMessage="We couldn't find that trip."
        backHref="/trips"
        backLabel="Back to trips"
      />
    );
  }

  return (
    <main className="min-h-screen p-8 bg-transparent border-none">
      <PageTransition>
        <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8 border-none flex items-center gap-2">
          Edit Trip
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-none">
          {initialData && (
            <TripForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
              isLoading={updateTrip.isPending}
            />
          )}
        </div>
      </div>
    </PageTransition>
  </main>
  );
}
