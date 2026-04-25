"use client";

import { useState, FormEvent, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import Image from "next/image";
import { Monitor, Trash2, Star } from "lucide-react";
import { apiDelete } from "@/lib/api";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useUpload } from "@/app/hooks/useUpload";
import { getImageUrl } from "@/lib/api";
import AuthImage from "@/components/AuthImage";
import RichTextEditor from "./RichTextEditor";
import DateTimePicker from "./DateTimePicker";
import GooglePhotosPicker from "./GooglePhotosPicker";
import ConfirmModal from "./ConfirmModal";

export interface CheckpointData {
  name: string;
  location: string;
  timestamp: string;
  description: string;
  photos: string[];
  journal: string;
  heroPhoto?: string;
}

interface CheckpointFormProps {
  initialData?: CheckpointData | null;
  onSubmit: (data: CheckpointData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface CheckpointFormHandle {
  requestClose: () => void;
}

interface SortablePhotoProps {
  photo: string;
  index: number;
  isHero: boolean;
  onRemove: () => void;
  onSetHero: () => void;
}

function SortablePhoto({ photo, index, isHero, onRemove, onSetHero }: SortablePhotoProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative aspect-video rounded-xl overflow-hidden border-2 shadow-sm group touch-none
        ${isDragging ? "opacity-50 scale-95 z-50" : ""}
        ${isHero ? "border-primary-400 dark:border-primary-500" : "border-white dark:border-gray-800"}
      `}
    >
      {/* Drag handle covers the whole tile */}
      <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing z-10" />

      <AuthImage
        src={getImageUrl(photo, 800)}
        alt={`Photo ${index + 1}`}
        fill
        className="object-cover transition-transform group-hover:scale-110"
      />

      {/* Hero badge */}
      {isHero && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-0.5 bg-primary-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow">
          <Star size={9} fill="currentColor" /> Hero
        </div>
      )}

      {/* Set as hero button (non-hero photos only) */}
      {!isHero && (
        <button
          type="button"
          onClick={onSetHero}
          className="absolute top-2 left-2 z-20 p-1.5 bg-black/50 text-white rounded-full hover:bg-primary-500 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
          title="Set as hero photo"
        >
          <Star size={12} />
        </button>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 z-20 p-1.5 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
        title="Remove photo"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

const formatDatetimeForInput = (dateString?: string) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16); // format: YYYY-MM-DDThh:mm
  } catch (e) {
    return "";
  }
};

const CheckpointForm = forwardRef<CheckpointFormHandle, CheckpointFormProps>(function CheckpointForm(
  { initialData, onSubmit, onCancel, isLoading }: CheckpointFormProps,
  ref
) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    location: initialData?.location || "",
    timestamp: formatDatetimeForInput(initialData?.timestamp) || "",
    description: initialData?.description || "",
    photos: initialData?.photos || [],
    journal: initialData?.journal || "",
    heroPhoto: initialData?.heroPhoto || "",
  });

  const [isDirty, setIsDirty] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const pendingUploads = useRef<Set<string>>(new Set());

  const { upload, uploading: isUploading } = useUpload((filename) => {
    pendingUploads.current.add(filename);
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // On unmount, delete any uploads that were never saved.
  useEffect(() => {
    return () => {
      pendingUploads.current.forEach((filename) => {
        apiDelete(`/v1/upload/${filename}`);
      });
    };
  }, []);


  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setIsDirty(true);
      setFormData(prev => {
        const oldIndex = prev.photos.indexOf(active.id as string);
        const newIndex = prev.photos.indexOf(over.id as string);
        return { ...prev, photos: arrayMove(prev.photos, oldIndex, newIndex) };
      });
    }
  };

  const setHeroPhoto = (photo: string) => {
    setIsDirty(true);
    setFormData(prev => ({ ...prev, heroPhoto: photo }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const urls = await Promise.all(files.map(f => upload(f)));
    const succeeded = urls.filter((u): u is string => !!u);
    if (succeeded.length) {
      setIsDirty(true);
      setFormData(prev => ({ ...prev, photos: [...prev.photos, ...succeeded] }));
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    const photo = formData.photos[index];
    // Fire-and-forget delete if the photo was uploaded this session.
    if (pendingUploads.current.has(photo)) {
      pendingUploads.current.delete(photo);
      apiDelete(`/v1/upload/${photo}`);
    }
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsDirty(true);
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleJournalChange = (html: string) => {
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, journal: html }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const submissionData = {
      ...formData,
      timestamp: formData.timestamp ? new Date(formData.timestamp).toISOString() : new Date().toISOString(),
    };

    await onSubmit(submissionData);
    pendingUploads.current.clear();
    setIsDirty(false);
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      pendingUploads.current.forEach((filename) => apiDelete(`/v1/upload/${filename}`));
      pendingUploads.current.clear();
      onCancel();
    }
  };

  useImperativeHandle(ref, () => ({ requestClose: handleCancel }));

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Event Name */}
      <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-gray-100 dark:border-gray-800 space-y-3">
        <label htmlFor="name" className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">
          Event Name
        </label>
        <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all focus-within:border-primary-500">
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="e.g. Whale watching in Morro Bay"
            value={formData.name}
            onChange={handleChange}
            className="w-full bg-transparent px-4 py-3 rounded-xl focus:outline-none text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Location */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-gray-100 dark:border-gray-800 space-y-3">
          <label htmlFor="location" className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">
            Location
          </label>
          <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all focus-within:border-primary-500">
            <input
              type="text"
              id="location"
              name="location"
              required
              placeholder="Manhattan"
              value={formData.location}
              onChange={handleChange}
              className="w-full bg-transparent px-4 py-3 rounded-xl focus:outline-none text-sm font-medium text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Time */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-gray-100 dark:border-gray-800 space-y-3">
          <label htmlFor="timestamp" className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">
            Time
          </label>
          <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all focus-within:border-primary-500">
            <DateTimePicker
              id="timestamp"
              value={formData.timestamp}
              onChange={(v) => setFormData((prev) => ({ ...prev, timestamp: v }))}
              placeholder="Select date & time"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-gray-100 dark:border-gray-800 space-y-3">
        <label htmlFor="description" className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">
          Brief Summary
        </label>
        <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all focus-within:border-primary-500">
          <input
            type="text"
            id="description"
            name="description"
            required
            placeholder="A short punchy line about the experience"
            value={formData.description}
            onChange={handleChange}
            className="w-full bg-transparent px-4 py-3 rounded-xl focus:outline-none text-sm font-medium text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Photos */}
      <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-gray-100 dark:border-gray-800 space-y-4">
        <label className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">
          Photos
        </label>

        <div className="rounded-2xl border-2 border-gray-100 dark:border-gray-800 p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Add more photos
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => !isUploading && fileInputRef.current?.click()}
              disabled={isUploading}
              className="aspect-video flex flex-col items-center justify-center gap-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all disabled:opacity-50"
            >
              <Monitor size={22} />
              <span className="text-xs font-bold">
                {isUploading ? "Uploading…" : "From your computer"}
              </span>
            </button>
            <GooglePhotosPicker
              variant="card"
              onSelect={(urls) => {
                if (!urls.length) return;
                urls.forEach((u) => pendingUploads.current.add(u));
                setFormData((prev) => ({
                  ...prev,
                  photos: [...prev.photos, ...urls],
                }));
              }}
            />
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
        />

        {formData.photos.length > 0 && (
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold -mb-1">
            Drag to reorder · First photo is the hero
          </p>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={formData.photos} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-2">
              {formData.photos.map((photo, index) => (
                <SortablePhoto
                  key={photo}
                  photo={photo}
                  index={index}
                  isHero={formData.heroPhoto ? photo === formData.heroPhoto : index === 0}
                  onRemove={() => removePhoto(index)}
                  onSetHero={() => setHeroPhoto(photo)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Journal Entry (Rich Text) */}
      <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-gray-100 dark:border-gray-800 space-y-3">
        <label className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">
          Full description
        </label>
        <RichTextEditor
          key={initialData?.name || "new"}
          initialValue={initialData?.journal || ""}
          onChange={handleJournalChange}
          placeholder="Start writing your adventure..."
          className="min-h-[200px]"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 px-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isLoading}
          className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors uppercase tracking-widest"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-8 py-3 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary-500/30 hover:bg-primary-700 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoading ? "Syncing..." : "Save Changes"}
        </button>
      </div>
    </form>

    <ConfirmModal
      isOpen={showCancelConfirm}
      title="Discard changes?"
      message="You have unsaved changes. If you close now, they'll be lost."
      confirmLabel="Discard changes"
      onConfirm={() => {
        setShowCancelConfirm(false);
        pendingUploads.current.forEach((filename) => apiDelete(`/v1/upload/${filename}`));
        pendingUploads.current.clear();
        onCancel();
      }}
      onCancel={() => setShowCancelConfirm(false)}
    />
    </>
  );
});

export default CheckpointForm;
