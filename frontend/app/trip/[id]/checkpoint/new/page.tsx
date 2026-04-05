"use client";

import { useRouter } from "next/navigation";
import CheckpointForm from "@/components/CheckpointForm";
import { useCreateCheckpoint } from "@/lib/queries/trips";
import toast from "react-hot-toast";

export default function NewCheckpointPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const createCheckpoint = useCreateCheckpoint(params.id);

  const handleSubmit = async (data: any) => {
    try {
      await createCheckpoint.mutateAsync(data);
      toast.success("Checkpoint added!");
      router.push(`/trip/${params.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add checkpoint");
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 border-none">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8 mt-4">
          Add New Checkpoint
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <CheckpointForm
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={createCheckpoint.isPending}
          />
        </div>
      </div>
    </main>
  );
}
