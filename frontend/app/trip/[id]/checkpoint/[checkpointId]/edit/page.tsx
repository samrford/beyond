"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CheckpointForm from "@/components/CheckpointForm";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function EditCheckpointPage({ params }: { params: { id: string, checkpointId: string } }) {
  const router = useRouter();
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCheckpoint = async () => {
      try {
        // we only have get trip endpoint currently, so fetch trip and find the checkpoint
        const response = await fetch(`${API_BASE_URL}/api/trips/${params.id}`);
        if (!response.ok) throw new Error("Failed to fetch trip");
        const data = await response.json();
        
        const checkpoints = data.Checkpoints || data.checkpoints || [];
        const cp = checkpoints.find((c: any) => (c.ID || c.id) === params.checkpointId);
        
        if (!cp) throw new Error("Checkpoint not found");

        setInitialData({
          name: cp.Name || cp.name,
          location: cp.Location || cp.location,
          timestamp: cp.Timestamp || cp.timestamp,
          description: cp.Description || cp.description,
          photos: cp.Photos || cp.photos || [],
          journal: cp.Journal || cp.journal,
        });
      } catch (error) {
        console.error("Error fetching checkpoint:", error);
        alert("Error loading checkpoint data");
        router.push(`/trip/${params.id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckpoint();
  }, [params.id, params.checkpointId, router]);

  const handleSubmit = async (data: any) => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/checkpoints/${params.checkpointId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update checkpoint");
      router.push(`/trip/${params.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error updating checkpoint");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 border-none">
        <div className="text-center">Loading checkpoint...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 border-none">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8 mt-4">
          Edit Checkpoint
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {initialData && (
            <CheckpointForm
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
