"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import CheckpointCard from "@/components/CheckpointCard";
import ConfirmModal from "@/components/ConfirmModal";
import { useTrip, useDeleteTrip, useDeleteCheckpoint } from "@/lib/queries/trips";
import { getImageUrl } from "@/lib/api";
import toast from "react-hot-toast";

export default function TripPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: trip, isLoading } = useTrip(params.id);
  const deleteTripMutation = useDeleteTrip();
  const deleteCheckpointMutation = useDeleteCheckpoint(params.id);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: "", id: "" });

  const handleDeleteTrip = () => {
    setDeleteModal({ isOpen: true, type: "trip", id: params.id });
  };

  const handleDeleteCheckpoint = (checkpointId: string) => {
    setDeleteModal({ isOpen: true, type: "checkpoint", id: checkpointId });
  };

  const confirmDelete = async () => {
    const { type, id } = deleteModal;
    setDeleteModal({ isOpen: false, type: "", id: "" });
    if (!id) return;

    try {
      if (type === "trip") {
        await deleteTripMutation.mutateAsync(id);
        toast.success("Trip deleted");
        router.push("/trips");
      } else if (type === "checkpoint") {
        await deleteCheckpointMutation.mutateAsync(id);
        toast.success("Checkpoint deleted");
      }
    } catch (error) {
      console.error(error);
      toast.error(`Error deleting ${type}`);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading trip...</p>
        </div>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Trip not found.</p>
          <Link href="/trips" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
            Back to trips
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Section */}
      <div className="relative h-64 bg-gray-300 dark:bg-gray-800">
        <Image
          src={getImageUrl(trip.headerPhoto)}
          alt={trip.name}
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent h-16" />
      </div>

      <div className="max-w-4xl mx-auto -mt-6 mb-4 relative px-4 flex items-center z-10">
        <Link
          href="/trips"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400 font-medium text-sm backdrop-blur-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back to all trips
        </Link>
      </div>

      {/* Trip Info */}
      <div className="max-w-4xl mx-auto relative px-4 text-gray-800 dark:text-gray-100">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-none relative">
          <div className="absolute top-6 right-6 flex gap-2">
            <Link
              href={`/trip/${trip.id}/edit`}
              className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-full transition-colors border-none"
              title="Edit Trip"
            >
              <Pencil size={20} />
            </Link>
            <button
              onClick={handleDeleteTrip}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors border-none focus:outline-none"
              title="Delete Trip"
            >
              <Trash2 size={20} />
            </button>
          </div>
          <h1 className="text-3xl font-bold mb-2 pr-20">{trip.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4 border-none">
            {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
          </p>
          <p className="text-gray-600 dark:text-gray-300">{trip.summary}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-4xl mx-auto px-4 py-8 border-none">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 border-none">Trip Timeline</h2>
          <Link
            href={`/trip/${trip.id}/checkpoint/new`}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white dark:bg-primary-500 rounded-md hover:bg-primary-700 dark:hover:bg-primary-600 border-none font-medium text-sm transition-colors"
          >
            <Plus size={16} />
            Add Checkpoint
          </Link>
        </div>
        <div className="space-y-8">
          {trip.checkpoints?.map((checkpoint, index) => (
            <CheckpointCard
              key={checkpoint.id}
              checkpoint={checkpoint}
              index={index}
              tripId={trip.id}
              onDelete={handleDeleteCheckpoint}
            />
          ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.type === "trip" ? "Delete Trip" : "Delete Checkpoint"}
        message={`Are you sure you want to permanently delete this ${deleteModal.type}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, type: "", id: "" })}
      />
    </main>
  );
}
