"use client";

import { useRouter } from "next/navigation";
import TripForm from "@/components/TripForm";
import { useCreateTrip } from "@/lib/queries/trips";
import { TripData } from "@/components/TripForm";
import toast from "react-hot-toast";

export default function NewTripPage() {
  const router = useRouter();
  const createTrip = useCreateTrip();

  const handleSubmit = async (data: TripData) => {
    try {
      const created = await createTrip.mutateAsync(data);
      toast.success("Trip created!");
      router.push(`/trip/${created.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create trip");
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add a New Trip</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Fill in the details below to log your latest adventure.
            </p>
          </div>
          <TripForm
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={createTrip.isPending}
          />
        </div>
      </div>
    </main>
  );
}
