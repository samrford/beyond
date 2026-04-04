"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TripForm from "@/components/TripForm";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function EditTripPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/trips/${params.id}`);
        if (!response.ok) throw new Error("Failed to fetch trip");
        const data = await response.json();
        setInitialData({
          name: data.Name || data.name,
          startDate: data.StartDate || data.startDate,
          endDate: data.EndDate || data.endDate,
          headerPhoto: data.HeaderPhoto || data.headerPhoto,
          summary: data.Summary || data.summary,
        });
      } catch (error) {
        console.error("Error fetching trip:", error);
        alert("Error loading trip data");
        router.push("/trips");
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [params.id, router]);

  const handleSubmit = async (data: any) => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trips/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update trip");
      router.push(`/trip/${params.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error updating trip");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 border-none">
        <div className="text-center">Loading trip...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 border-none">
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
              isLoading={isSaving}
            />
          )}
        </div>
      </div>
    </main>
  );
}
