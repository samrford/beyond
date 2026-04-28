"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PlanForm from "@/components/PlanForm";
import { usePlan, useUpdatePlan, Plan } from "@/lib/queries/plans";
import toast from "react-hot-toast";
import PageTransition from "@/components/PageTransition";
import QueryBoundary from "@/components/QueryBoundary";

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: plan, isLoading, isError, error, refetch } = usePlan(id);
  const updatePlan = useUpdatePlan(id);

  useEffect(() => {
    if (plan && !plan.isOwner) {
      router.replace(`/plans/${id}`);
    }
  }, [plan, id, router]);

  const handleSubmit = async (data: Partial<Plan>) => {
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

  if (isLoading || isError || !plan) {
    return (
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        loadingMessage="Preparing plan details..."
        notFound={!isLoading && !isError && !plan}
        notFoundMessage="We couldn't find that plan."
        backHref="/plans"
        backLabel="Back to plans"
      />
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
