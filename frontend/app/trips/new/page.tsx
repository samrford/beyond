"use client";

import { useRouter } from "next/navigation";
import TripForm from "@/components/TripForm";
import { useCreateTrip } from "@/lib/queries/trips";

export default function NewTripPage() {
  const router = useRouter();
  const createTrip = useCreateTrip();

  const handleSubmit = async (data: any) => {
    try {
      const created = await createTrip.mutateAsync(data);
      router.push(`/trip/${created.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error creating trip");
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8">
          Plan a New Trip
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
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
