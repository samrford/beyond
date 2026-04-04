"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

interface Plan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  coverPhoto: string;
  summary: string;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, planId: "" });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/plans");
      if (!response.ok) throw new Error("Failed to fetch plans");
      const data = await response.json();
      
      const normalizedPlans: Plan[] = data.map((p: any) => ({
        id: p.id || p.ID,
        name: p.name || p.Name,
        startDate: p.startDate || p.StartDate,
        endDate: p.endDate || p.EndDate,
        coverPhoto: p.coverPhoto || p.CoverPhoto,
        summary: p.summary || p.Summary,
      }));
      
      setPlans(normalizedPlans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // Stop link navigation
    setDeleteModal({ isOpen: true, planId: id });
  };

  const confirmDelete = async () => {
    const id = deleteModal.planId;
    setDeleteModal({ isOpen: false, planId: "" });
    if (!id) return;

    try {
      const response = await fetch(`http://localhost:8080/api/plans/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchPlans();
      } else {
        alert("Failed to delete plan");
      }
    } catch (error) {
      console.error(error);
      alert("Error deleting plan");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading plans...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 border-none">
      <div className="max-w-4xl mx-auto py-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 border-none">My Plans</h1>
          <Link
            href="/plans/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white dark:bg-primary-500 rounded-md hover:bg-primary-700 dark:hover:bg-primary-600 border-none font-medium text-sm transition-colors"
          >
            <Plus size={18} />
            New Plan
          </Link>
        </div>
        
        {plans.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-dashed border-gray-300 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">No plans yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Start planning your next adventure today.</p>
            <Link
              href="/plans/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white dark:bg-primary-500 rounded-md hover:bg-primary-700 transition-colors font-medium"
            >
              <Plus size={20} />
              Create your first plan
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 border-none">
            {plans.map((plan) => (
              <Link
                key={plan.id}
                href={`/plans/${plan.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-transparent dark:border-gray-700"
              >
                <div className="h-48 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                  {plan.coverPhoto ? (
                    <img
                      src={plan.coverPhoto}
                      alt={plan.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400">
                      No Photo
                    </div>
                  )}
                </div>

                <div className="p-6 relative border-none">
                  <button
                    onClick={(e) => handleDelete(plan.id, e)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors focus:outline-none focus:ring-2 border-none"
                    aria-label="Delete Plan"
                  >
                    <Trash2 size={20} />
                  </button>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2 mr-8">
                    {plan.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 border-none">
                    {new Date(plan.startDate).toLocaleDateString()} -{" "}
                    {new Date(plan.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 line-clamp-2 border-none">{plan.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Plan"
        message="Are you sure you want to permanently delete this plan? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, planId: "" })}
      />
    </main>
  );
}
