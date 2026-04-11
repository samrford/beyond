"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import Image from "next/image";
import { Upload, X, Trash2 } from "lucide-react";
import { useUpload } from "@/app/hooks/useUpload";
import RichTextEditor from "./RichTextEditor";

interface CheckpointData {
  name: string;
  location: string;
  timestamp: string;
  description: string;
  photos: string[];
  journal: string;
}

interface CheckpointFormProps {
  initialData?: CheckpointData | null;
  onSubmit: (data: CheckpointData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
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

export default function CheckpointForm({ initialData, onSubmit, onCancel, isLoading }: CheckpointFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    location: initialData?.location || "",
    timestamp: formatDatetimeForInput(initialData?.timestamp) || "",
    description: initialData?.description || "",
    photos: initialData?.photos || [],
    journal: initialData?.journal || "",
  });

  const { upload, uploading: isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await upload(file);
    if (url) {
      setFormData((prev) => ({
        ...prev,
        photos: [...prev.photos, url]
      }));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleJournalChange = (html: string) => {
    setFormData((prev) => ({ ...prev, journal: html }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const submissionData = {
      ...formData,
      timestamp: formData.timestamp ? new Date(formData.timestamp).toISOString() : new Date().toISOString(),
    };

    await onSubmit(submissionData);
  };

  return (
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
            <input
              type="datetime-local"
              id="timestamp"
              name="timestamp"
              required
              value={formData.timestamp}
              onChange={handleChange}
              className="w-full bg-transparent px-4 py-3 rounded-xl focus:outline-none text-sm font-medium text-gray-900 dark:text-white"
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-2">
          {formData.photos.map((photo, index) => (
            <div key={index} className="relative aspect-video rounded-xl overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm group">
              <Image
                src={photo}
                alt={`Photo ${index + 1}`}
                fill
                className="object-cover transition-transform group-hover:scale-110"
                unoptimized
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                title="Remove photo"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`aspect-video flex flex-col justify-center items-center border-2 border-gray-200 dark:border-gray-700 border-dashed rounded-xl cursor-pointer hover:border-primary-500 hover:bg-white dark:hover:bg-gray-800 transition-all group ${isUploading ? "opacity-50 cursor-not-allowed" : ""
              }`}
          >
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-2xl text-gray-400 group-hover:text-primary-500 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
              <Upload size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">
              {isUploading ? "Syncing..." : "Add Photo"}
            </span>
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
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
          onClick={onCancel}
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
          {isLoading ? "Syncing..." : "Commit Changes"}
        </button>
      </div>
    </form>
  );
}
