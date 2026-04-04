"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import PlanForm from "@/components/PlanForm";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [plan, setPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/plans/${id}`);
        if (!response.ok) throw new Error("Failed to fetch plan");
        const data = await response.json();
        setPlan(data);
      } catch (error) {
        console.error(error);
        alert("Error loading plan");
        router.push("/plans");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlan();
  }, [id, router]);

  const handleSubmit = async (data: any) => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update plan");
      
      router.push(`/plans/${id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error updating plan");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading plan...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8">
          Edit Plan: {plan?.name}
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <PlanForm 
            initialData={plan} 
            onSubmit={handleSubmit} 
            onCancel={() => router.back()}
            isLoading={isSaving}
          />
        </div>
      </div>
    </main>
  );
}
