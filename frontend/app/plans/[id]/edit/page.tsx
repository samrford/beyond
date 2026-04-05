"use client";

import { useRouter, useParams } from "next/navigation";
import PlanForm from "@/components/PlanForm";
import { usePlan, useUpdatePlan } from "@/lib/queries/plans";
import toast from "react-hot-toast";
import LoadingGlobe from "@/components/LoadingGlobe";
import PageTransition from "@/components/PageTransition";

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: plan, isLoading } = usePlan(id);
  const updatePlan = useUpdatePlan(id);

  const handleSubmit = async (data: any) => {
    try {
      await updatePlan.mutateAsync(data);
      toast.success("Plan updated!");
      router.push(`/plans/${id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update plan");
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-transparent flex items-center justify-center">
        <LoadingGlobe message="Preparing plan details..." />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-transparent border-none">
      <PageTransition>
        <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8">
          Edit Plan: {plan?.name}
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <PlanForm
            initialData={plan}
            onSubmit={handleSubmit}
            isLoading={updatePlan.isPending}
          />
        </div>
      </div>
    </PageTransition>
  </main>
  );
}
