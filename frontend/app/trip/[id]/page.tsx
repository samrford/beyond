"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ArrowLeft, Lock, Globe } from "lucide-react";
import CheckpointCard from "@/components/CheckpointCard";
import ConfirmModal from "@/components/ConfirmModal";
import PageTransition from "@/components/PageTransition";
import CheckpointModal from "@/components/CheckpointModal";
import QueryBoundary from "@/components/QueryBoundary";
import { useTrip, useDeleteTrip, useDeleteCheckpoint, useUpdateCheckpoint, useCreateCheckpoint, useUpdateTrip, Checkpoint } from "@/lib/queries/trips";
import { CheckpointData } from "@/components/CheckpointForm";
import { getImageUrl } from "@/lib/api";
import toast from "react-hot-toast";
import AuthImage from "@/components/AuthImage";
import TripBackground, { tripBackgroundIsDirty, TripBackgroundValue } from "@/components/TripBackground";

export default function TripPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: trip, isLoading, isError, error, refetch } = useTrip(params.id);
  const deleteTripMutation = useDeleteTrip();
  const deleteCheckpointMutation = useDeleteCheckpoint(params.id);
  const updateCheckpointMutation = useUpdateCheckpoint(params.id);
  const createCheckpointMutation = useCreateCheckpoint(params.id);
  const updateTripMutation = useUpdateTrip(params.id);

  const savedBg: TripBackgroundValue = useMemo(
    () => ({
      mode: trip?.bgMode ?? "default",
      blur: trip?.bgBlur ?? 20,
      opacity: trip?.bgOpacity ?? 100,
      darkness: trip?.bgDarkness ?? 10,
    }),
    [trip?.bgMode, trip?.bgBlur, trip?.bgOpacity, trip?.bgDarkness],
  );
  const [bg, setBg] = useState<TripBackgroundValue>(savedBg);
  const savedKey = `${savedBg.mode}|${savedBg.blur}|${savedBg.opacity}|${savedBg.darkness}`;
  useEffect(() => {
    setBg(savedBg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const isDirty = tripBackgroundIsDirty(bg, savedBg);

  const handleSaveBg = () => {
    if (!trip) return;
    updateTripMutation.mutate({
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      headerPhoto: trip.headerPhoto,
      summary: trip.summary,
      isPublic: trip.isPublic,
      bgMode: bg.mode,
      bgBlur: bg.blur,
      bgOpacity: bg.opacity,
      bgDarkness: bg.darkness,
    });
  };
  
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: "", id: "" });
  const [editModal, setEditModal] = useState<{ isOpen: boolean; checkpoint: Checkpoint | null }>({
    isOpen: false,
    checkpoint: null,
  });

  const handleDeleteTrip = () => {
    setDeleteModal({ isOpen: true, type: "trip", id: params.id });
  };

  const handleDeleteCheckpoint = (checkpointId: string) => {
    setDeleteModal({ isOpen: true, type: "checkpoint", id: checkpointId });
  };

  const handleEditCheckpoint = (checkpoint: Checkpoint) => {
    setEditModal({ isOpen: true, checkpoint });
  };

  const handleUpdateCheckpoint = async (data: CheckpointData) => {
    if (!editModal.checkpoint) return;
    
    try {
      await updateCheckpointMutation.mutateAsync({
        checkpointId: editModal.checkpoint.id,
        data,
      });
      toast.success("Checkpoint updated!");
      setEditModal({ isOpen: false, checkpoint: null });
    } catch (error) {
      console.error(error);
      toast.error("Failed to update checkpoint");
    }
  };

  const handleCreateCheckpoint = async (data: CheckpointData) => {
    try {
      await createCheckpointMutation.mutateAsync(data);
      toast.success("Checkpoint added!");
      setEditModal({ isOpen: false, checkpoint: null });
    } catch (error) {
      console.error(error);
      toast.error("Failed to add checkpoint");
    }
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

  if (isLoading || isError || !trip) {
    return (
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        loadingMessage="Loading your adventure..."
        notFound={!isLoading && !isError && !trip}
        notFoundMessage="We couldn't find that trip."
        backHref="/trips"
        backLabel="Back to trips"
      />
    );
  }

  const isOwner = trip.isOwner;
  const heroSrc = getImageUrl(trip.headerPhoto, 2400);

  return (
    <main className="min-h-screen bg-transparent">
      <TripBackground
        imageUrl={heroSrc}
        value={bg}
        onChange={setBg}
        isDirty={isDirty}
        isSaving={updateTripMutation.isPending}
        onSave={handleSaveBg}
        readOnly={!isOwner}
      />
      <PageTransition>
        {/* Header Section */}
      <div
        className="relative h-72"
        style={{
          maskImage:
            "linear-gradient(to bottom, black 0%, black 65%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, black 65%, transparent 100%)",
        }}
      >
        <AuthImage
          src={heroSrc}
          alt={trip.name}
          fill
          className="object-cover"
        />
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
          {isOwner && (
            <div className="absolute top-6 right-6 flex items-center gap-2">
              <span
                className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                  trip.isPublic
                    ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                {trip.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                {trip.isPublic ? "Public" : "Private"}
              </span>
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
          )}
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
          {isOwner && (
            <button
              onClick={() => setEditModal({ isOpen: true, checkpoint: null })}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white dark:bg-primary-500 rounded-md hover:bg-primary-700 dark:hover:bg-primary-600 border-none font-medium text-sm transition-colors"
            >
              <Plus size={16} />
              Add Checkpoint
            </button>
          )}
        </div>
        <div className="space-y-8">
          {trip.checkpoints?.map((checkpoint, index) => (
            <CheckpointCard
              key={checkpoint.id}
              checkpoint={checkpoint}
              index={index}
              tripId={trip.id}
              onDelete={handleDeleteCheckpoint}
              onEdit={handleEditCheckpoint}
              readOnly={!isOwner}
            />
          ))}
        </div>
      </div>
    </PageTransition>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.type === "trip" ? "Delete Trip" : "Delete Checkpoint"}
        message={`Are you sure you want to permanently delete this ${deleteModal.type}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, type: "", id: "" })}
      />

      <CheckpointModal
        isOpen={editModal.isOpen}
        checkpoint={editModal.checkpoint}
        title={editModal.checkpoint ? "Edit Checkpoint" : "Add Checkpoint"}
        onClose={() => setEditModal({ isOpen: false, checkpoint: null })}
        onSubmit={editModal.checkpoint ? handleUpdateCheckpoint : handleCreateCheckpoint}
        isSaving={editModal.checkpoint ? updateCheckpointMutation.isPending : createCheckpointMutation.isPending}
      />
    </main>
  );
}
