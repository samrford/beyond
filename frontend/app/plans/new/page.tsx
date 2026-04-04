"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PlanForm from "@/components/PlanForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function NewPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: any) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/plans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create plan");

      const data = await response.json();
      router.push(`/plans/${data.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error creating plan:", error);
      alert("Failed to create plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/plans"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 mb-6 transition-colors font-medium"
        >
          <ArrowLeft size={20} />
          Back to Plans
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create New Plan</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 font-medium">
            Fill in the details below to start organizing your next great adventure.
          </p>

          <PlanForm onSubmit={handleSubmit} isLoading={loading} />
        </div>
      </div>
    </main>
  );
}
