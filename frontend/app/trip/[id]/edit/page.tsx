"use client";

import { useRouter } from "next/navigation";
import TripForm from "@/components/TripForm";
import { useTrip, useUpdateTrip } from "@/lib/queries/trips";
import { TripData } from "@/components/TripForm";
import toast from "react-hot-toast";
import LoadingGlobe from "@/components/LoadingGlobe";
import PageTransition from "@/components/PageTransition";

export default function EditTripPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: trip, isLoading } = useTrip(params.id);
  const updateTrip = useUpdateTrip(params.id);

  const initialData = trip
    ? {
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        headerPhoto: trip.headerPhoto,
        summary: trip.summary,
      }
    : null;

  const handleSubmit = async (data: TripData) => {
    try {
      await updateTrip.mutateAsync(data);
      toast.success("Trip updated!");
      router.push(`/trip/${params.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update trip");
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-transparent flex items-center justify-center">
        <LoadingGlobe message="Preparing trip details..." />
      </main>
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
