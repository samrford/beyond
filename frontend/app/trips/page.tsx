"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import { useTrips, useDeleteTrip } from "@/lib/queries/trips";
import { getImageUrl } from "@/lib/api";
import toast from "react-hot-toast";
import LoadingGlobe from "@/components/LoadingGlobe";
import PageTransition from "@/components/PageTransition";

export default function TripsPage() {
  const { data: trips = [], isLoading } = useTrips();
  const deleteTrip = useDeleteTrip();
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, tripId: "" });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDeleteModal({ isOpen: true, tripId: id });
  };

  const confirmDelete = async () => {
    const id = deleteModal.tripId;
    setDeleteModal({ isOpen: false, tripId: "" });
    if (!id) return;

    try {
      await deleteTrip.mutateAsync(id);
      toast.success("Trip deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete trip");
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-8 bg-transparent flex items-center justify-center">
        <LoadingGlobe message="Finding your trips..." />
      </main>
    );
  }

  if (trips.length === 0) {
    return (
      <main className="min-h-screen p-8 bg-transparent">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No trips found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-transparent border-none">
      <PageTransition>
        <div className="max-w-4xl mx-auto py-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 border-none">My Trips</h1>
            <Link
              href="/trips/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white dark:bg-primary-500 rounded-md hover:bg-primary-700 dark:hover:bg-primary-600 border-none font-medium text-sm transition-colors"
            >
              <Plus size={18} />
              New Trip
            </Link>
          </div>
          <div className="grid gap-6 border-none">
            {trips.map((trip) => (
              <Link
                key={trip.id}
                href={`/trip/${trip.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-transparent dark:border-gray-700"
              >
                <div className="h-48 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                  <Image
                    src={getImageUrl(trip.headerPhoto)}
                    alt={trip.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                <div className="p-6 relative border-none">
                  <button
                    onClick={(e) => handleDelete(trip.id, e)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors focus:outline-none focus:ring-2 border-none"
                    aria-label="Delete Trip"
                  >
                    <Trash2 size={20} />
                  </button>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2 mr-8">
                    {trip.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 border-none">
                    {new Date(trip.startDate).toLocaleDateString()} -{" "}
                    {new Date(trip.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 line-clamp-2 border-none">{trip.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </PageTransition>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Trip"
        message="Are you sure you want to permanently delete this trip? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, tripId: "" })}
      />
    </main>
  );
}
