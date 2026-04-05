"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Calendar, MapPin, Trash2 } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import { usePlans, useDeletePlan } from "@/lib/queries/plans";
import { getImageUrl } from "@/lib/api";
import toast from "react-hot-toast";

export default function PlansPage() {
  const { data: plans = [], isLoading } = usePlans();
  const deletePlan = useDeletePlan();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deletePlan.mutateAsync(deletingId);
      toast.success("Plan deleted");
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("Failed to delete plan");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
               Planning Board
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
              Dream up and organize your upcoming adventures.
            </p>
          </div>
          <Link
            href="/plans/new"
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={20} />
            New Plan
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-20">
            <p className="text-gray-600 dark:text-gray-400 font-medium">Loading your plans...</p>
          </div>
        ) : plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div key={plan.id} className="relative group">
                <Link
                  href={`/plans/${plan.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
                >
                  <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <Image
                      src={getImageUrl(plan.coverPhoto)}
                      alt={plan.name}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-lg font-bold text-white line-clamp-1">{plan.name}</h3>
                      <div className="flex items-center gap-2 text-white/80 text-xs mt-1 font-medium">
                        <Calendar size={12} />
                        {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {plan.summary || "No summary provided for this adventure."}
                    </p>
                    <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                      View Itinerary →
                    </div>
                  </div>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeletingId(plan.id);
                  }}
                  className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-gray-800/90 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110 active:scale-95"
                  title="Delete Plan"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <MapPin className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">No plans yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto font-medium">
              Start planning your next destination and we&apos;ll help you organize the details.
            </p>
            <Link
              href="/plans/new"
              className="inline-block bg-primary-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Plan"
        message="Are you sure you want to delete this plan? All associated itinerary items and days will be permanently removed. This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </main>
  );
}
