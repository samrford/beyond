"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CheckpointForm from "@/components/CheckpointForm";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function NewCheckpointPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trips/${params.id}/checkpoints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to create checkpoint");
      router.push(`/trip/${params.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error creating checkpoint");
    } finally {
      setIsLoading(false);
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
            isLoading={isLoading}
          />
        </div>
      </div>
    </main>
  );
}
