"use client";

import { useState, FormEvent, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { createPortal } from "react-dom";
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

type PhotoSlot = "hero" | "1" | "2" | "3";

export interface CheckpointData {
  name: string;
  location: string;
  timestamp: string;
  endTimestamp?: string;
  description: string;
  photos: string[];
  journal: string;
  heroPhoto?: string;
  sidePhoto1?: string;
  sidePhoto2?: string;
  sidePhoto3?: string;
}

interface CheckpointFormProps {
  initialData?: CheckpointData | null;
  onSubmit: (data: CheckpointData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  tripStartDate?: string;
}

export interface CheckpointFormHandle {
  requestClose: () => void;
}

interface SortablePhotoProps {
  photo: string;
  index: number;
  currentSlot: PhotoSlot | null;
  onSetSlot: (slot: PhotoSlot | null) => void;
  onRemove: () => void;
}

const SLOT_CONFIG: Record<PhotoSlot, { label: string; bg: string; fg: string }> = {
  hero: { label: "Hero", bg: "bg-gradient-to-b from-primary-400 to-primary-600", fg: "text-white" },
  "1":  { label: "1",    bg: "bg-gradient-to-b from-yellow-300 to-yellow-500",   fg: "text-yellow-900" },
  "2":  { label: "2",    bg: "bg-gradient-to-b from-slate-200 to-slate-400",     fg: "text-slate-700" },
  "3":  { label: "3",    bg: "bg-gradient-to-b from-yellow-600 to-amber-800",    fg: "text-white" },
};

// Disc dimensions for the portal radial popup
const DISC_R = 52;   // disc radius (px)
const ITEM_R = 36;   // radial button orbit radius (px)

// 4 slots arranged as a diamond: top-right, bottom-right, bottom-left, top-left
const RADIAL_ITEMS: { slot: PhotoSlot; angle: number }[] = [
  { slot: "hero", angle: 315 },
  { slot: "1",    angle: 45  },
  { slot: "2",    angle: 135 },
  { slot: "3",    angle: 225 },
];

function SortablePhoto({ photo, index, currentSlot, onSetSlot, onRemove }: SortablePhotoProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo });
  const [popupOpen, setPopupOpen] = useState(false);
  const [discPos, setDiscPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const slotCfg = currentSlot ? SLOT_CONFIG[currentSlot] : null;

  const openPopup = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setDiscPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    setPopupOpen(true);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative aspect-video rounded-xl overflow-hidden border-2 shadow-sm group touch-none
        ${isDragging ? "opacity-50 scale-95 z-50" : ""}
        ${currentSlot === "hero" ? "border-primary-400 dark:border-primary-500" : "border-white dark:border-gray-800"}
      `}
    >
      {/* Drag handle */}
      <div {...attributes} {...listeners} className="absolute inset-0 cursor-grab active:cursor-grabbing z-10" />

      <AuthImage
        src={getImageUrl(photo, 800)}
        alt={`Photo ${index + 1}`}
        fill
        className="object-cover transition-transform group-hover:scale-110"
      />

      {/* Slot trigger — coloured badge when assigned, hollow star on hover when not */}
      {slotCfg ? (
        <div className="absolute top-2 left-2 z-20">
          {/* Blurred dark halo so the badge reads on any image */}
          <div className="absolute -inset-2 rounded-full bg-black/50 blur-md pointer-events-none" />
          <button
            ref={triggerRef}
            type="button"
            onClick={openPopup}
            className={`relative overflow-hidden flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md ring-1 ring-inset ring-white/40 cursor-pointer ${slotCfg.bg} ${slotCfg.fg}`}
          >
            <span className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-full" />
            <span className="relative flex items-center gap-1">
              {currentSlot === "hero" ? <><Star size={9} fill="currentColor" /> Hero</> : currentSlot}
            </span>
          </button>
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={openPopup}
          className="absolute top-2 left-2 z-20 p-1.5 bg-black/50 text-white rounded-full hover:bg-primary-500 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
          title="Assign slot"
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

      {/* Portal radial disc — escapes overflow-hidden so it floats above the grid */}
      {popupOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[200]" onClick={() => setPopupOpen(false)} />
          <div
            className="fixed z-[201] pointer-events-none"
            style={{ left: discPos.x - DISC_R, top: discPos.y - DISC_R, width: DISC_R * 2, height: DISC_R * 2 }}
          >
            {/* Dark blurred disc */}
            <div className="absolute inset-0 rounded-full bg-black/75 backdrop-blur-sm shadow-xl" />

            {/* Current-slot indicator at centre */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`relative overflow-hidden w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black ring-1 ring-inset ring-white/40 ${slotCfg ? `${slotCfg.bg} ${slotCfg.fg}` : "bg-white/20 text-white"}`}>
                <span className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-full" />
                <span className="relative">
                  {currentSlot === "hero" ? <Star size={8} fill="currentColor" /> : (currentSlot ?? <Star size={8} />)}
                </span>
              </div>
            </div>

            {/* Radial slot buttons */}
            {RADIAL_ITEMS.map(({ slot, angle }) => {
              const cfg = SLOT_CONFIG[slot];
              const isActive = currentSlot === slot;
              const rad = (angle * Math.PI) / 180;
              const bx = DISC_R + ITEM_R * Math.cos(rad) - 16;  // 16 = half of w-8 (32px)
              const by = DISC_R + ITEM_R * Math.sin(rad) - 16;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSetSlot(isActive ? null : slot); setPopupOpen(false); }}
                  style={{ left: bx, top: by, pointerEvents: "auto" }}
                  className={`absolute overflow-hidden w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg ring-1 ring-inset ring-white/40 transition-transform hover:scale-110 ${cfg.bg} ${cfg.fg} ${isActive ? "ring-2 ring-white scale-110" : ""}`}
                  title={cfg.label}
                >
                  <span className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-full" />
                  <span className="relative">
                    {slot === "hero" ? <Star size={11} fill="currentColor" /> : slot}
                  </span>
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}
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
  { initialData, onSubmit, onCancel, isLoading, tripStartDate }: CheckpointFormProps,
  ref
) {
  const defaultMonth = tripStartDate ? new Date(tripStartDate) : undefined;

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    location: initialData?.location || "",
    timestamp: formatDatetimeForInput(initialData?.timestamp) || "",
    endTimestamp: formatDatetimeForInput(initialData?.endTimestamp) || "",
    description: initialData?.description || "",
    photos: initialData?.photos || [],
    journal: initialData?.journal || "",
    heroPhoto: initialData?.heroPhoto || "",
    sidePhoto1: initialData?.sidePhoto1 || "",
    sidePhoto2: initialData?.sidePhoto2 || "",
    sidePhoto3: initialData?.sidePhoto3 || "",
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

  const getPhotoSlot = (photo: string): PhotoSlot | null => {
    if (formData.heroPhoto === photo) return "hero";
    if (formData.sidePhoto1 === photo) return "1";
    if (formData.sidePhoto2 === photo) return "2";
    if (formData.sidePhoto3 === photo) return "3";
    return null;
  };

  const setPhotoSlot = (photo: string, slot: PhotoSlot | null) => {
    setIsDirty(true);
    setFormData(prev => {
      const updates: Partial<typeof prev> = {
        heroPhoto: prev.heroPhoto === photo ? "" : prev.heroPhoto,
        sidePhoto1: prev.sidePhoto1 === photo ? "" : prev.sidePhoto1,
        sidePhoto2: prev.sidePhoto2 === photo ? "" : prev.sidePhoto2,
        sidePhoto3: prev.sidePhoto3 === photo ? "" : prev.sidePhoto3,
      };
      if (slot === "hero") updates.heroPhoto = photo;
      if (slot === "1") updates.sidePhoto1 = photo;
      if (slot === "2") updates.sidePhoto2 = photo;
      if (slot === "3") updates.sidePhoto3 = photo;
      return { ...prev, ...updates };
    });
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
    if (pendingUploads.current.has(photo)) {
      pendingUploads.current.delete(photo);
      apiDelete(`/v1/upload/${photo}`);
    }
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
      heroPhoto: prev.heroPhoto === photo ? "" : prev.heroPhoto,
      sidePhoto1: prev.sidePhoto1 === photo ? "" : prev.sidePhoto1,
      sidePhoto2: prev.sidePhoto2 === photo ? "" : prev.sidePhoto2,
      sidePhoto3: prev.sidePhoto3 === photo ? "" : prev.sidePhoto3,
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

    const submissionData: CheckpointData = {
      ...formData,
      timestamp: formData.timestamp ? new Date(formData.timestamp).toISOString() : new Date().toISOString(),
      endTimestamp: formData.endTimestamp ? new Date(formData.endTimestamp).toISOString() : undefined,
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
            <label className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">
              Time
            </label>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Start</p>
              <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all focus-within:border-primary-500">
                <DateTimePicker
                  id="timestamp"
                  value={formData.timestamp}
                  onChange={(v) => { setIsDirty(true); setFormData((prev) => ({ ...prev, timestamp: v })); }}
                  placeholder="Select start date & time"
                  defaultMonth={defaultMonth}
                />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 pt-1">End <span className="normal-case font-normal tracking-normal">(optional)</span></p>
              <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all focus-within:border-primary-500">
                <DateTimePicker
                  id="endTimestamp"
                  value={formData.endTimestamp}
                  onChange={(v) => { setIsDirty(true); setFormData((prev) => ({ ...prev, endTimestamp: v })); }}
                  placeholder="Select end date & time"
                  defaultMonth={defaultMonth}
                />
              </div>
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
              Drag to reorder · Hover and click on the star icon to assign Hero (big photo to the left) and 1st, 2nd, 3rd slots (stack vertically to the right) to be shown on the checkpoint card
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
                    currentSlot={getPhotoSlot(photo)}
                    onSetSlot={(slot) => setPhotoSlot(photo, slot)}
                    onRemove={() => removePhoto(index)}
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
