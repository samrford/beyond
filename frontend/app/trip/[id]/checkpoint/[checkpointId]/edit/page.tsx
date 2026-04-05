"use client";

import { useRouter } from "next/navigation";
import CheckpointForm from "@/components/CheckpointForm";
import { useTrip, useUpdateCheckpoint } from "@/lib/queries/trips";

export default function EditCheckpointPage({ params }: { params: { id: string, checkpointId: string } }) {
  const router = useRouter();
  const { data: trip, isLoading } = useTrip(params.id);
  const updateCheckpoint = useUpdateCheckpoint(params.id);

  const checkpoint = trip?.checkpoints?.find((c) => c.id === params.checkpointId);

  const initialData = checkpoint
    ? {
        name: checkpoint.name,
        location: checkpoint.location,
        timestamp: checkpoint.timestamp,
        description: checkpoint.description,
        photos: checkpoint.photos || [],
        journal: checkpoint.journal,
      }
    : null;

  const handleSubmit = async (data: any) => {
    try {
      await updateCheckpoint.mutateAsync({
        checkpointId: params.checkpointId,
        data,
      });
      router.push(`/trip/${params.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error updating checkpoint");
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 border-none">
        <div className="text-center">Loading checkpoint...</div>
      </main>
    );
  }

  if (!initialData) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 border-none">
        <div className="text-center">Checkpoint not found.</div>
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
          <CheckpointForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={updateCheckpoint.isPending}
          />
        </div>
      </div>
    </main>
  );
}
