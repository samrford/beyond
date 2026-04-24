"use client";

import { useRouter } from "next/navigation";
import CheckpointForm from "@/components/CheckpointForm";
import { useTrip, useUpdateCheckpoint } from "@/lib/queries/trips";
import { CheckpointData } from "@/components/CheckpointForm";
import toast from "react-hot-toast";
import QueryBoundary from "@/components/QueryBoundary";

export default function EditCheckpointPage({ params }: { params: { id: string, checkpointId: string } }) {
  const router = useRouter();
  const { data: trip, isLoading, isError, error, refetch } = useTrip(params.id);
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
        heroPhoto: checkpoint.heroPhoto || "",
      }
    : null;

  const handleSubmit = async (data: CheckpointData) => {
    try {
      await updateCheckpoint.mutateAsync({
        checkpointId: params.checkpointId,
        data,
      });
      toast.success("Checkpoint updated!");
      router.push(`/trip/${params.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update checkpoint");
    }
  };

  if (isLoading || isError || !trip || !initialData) {
    return (
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        loadingMessage="Loading checkpoint details..."
        notFound={!isLoading && !isError && (!trip || !initialData)}
        notFoundMessage="We couldn't find that checkpoint."
        backHref={`/trip/${params.id}`}
        backLabel="Back to trip"
      />
    );
  }

  return (
    <main className="min-h-screen p-8 bg-transparent border-none">
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
