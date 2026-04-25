"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import { Upload, X, Calendar, AlignLeft } from "lucide-react";
import { useUpload } from "@/app/hooks/useUpload";
import { getImageUrl } from "@/lib/api";
import DatePicker from "./DatePicker";
import GooglePhotosPicker from "./GooglePhotosPicker";

export interface TripData {
  name: string;
  startDate: string;
  endDate: string;
  headerPhoto: string;
  summary: string;
}

interface TripFormProps {
  initialData?: TripData | null;
  onSubmit: (data: TripData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const formatDateForInput = (dateString?: string) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch (e) {
    return "";
  }
};

export default function TripForm({ initialData, onSubmit, onCancel, isLoading }: TripFormProps) {
  const [formData, setFormData] = useState<TripData>({
    name: initialData?.name || "",
    startDate: formatDateForInput(initialData?.startDate) || "",
    endDate: formatDateForInput(initialData?.endDate) || "",
    headerPhoto: initialData?.headerPhoto || "",
    summary: initialData?.summary || "",
  });
  
  const { upload, uploading: isUploading } = useUpload();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file);
    if (url) {
      setFormData((prev) => ({ ...prev, headerPhoto: url }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Ensure dates are parsed to RFC3339 for backend compatibility
    const submissionData = {
      ...formData,
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : new Date().toISOString(),
    };

    await onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
          Trip Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Two Weeks in Japan"
          className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
            <Calendar size={14} /> Start Date
          </label>
          <DatePicker
            id="startDate"
            value={formData.startDate}
            onChange={(v) => setFormData((prev) => ({ ...prev, startDate: v }))}
            placeholder="Select a date"
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
            <Calendar size={14} /> End Date
          </label>
          <DatePicker
            id="endDate"
            value={formData.endDate}
            onChange={(v) => setFormData((prev) => ({ ...prev, endDate: v }))}
            placeholder="Select a date"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
          Header Photo
        </label>
        <div className="relative group overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 aspect-video flex flex-col items-center justify-center transition-all hover:border-primary-500 active:scale-[0.98]">
          {formData.headerPhoto ? (
            <>
              <Image
                src={getImageUrl(formData.headerPhoto, 1600)}
                alt="Header Preview"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                unoptimized
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, headerPhoto: "" }))}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <Upload size={32} className="text-gray-400 group-hover:text-primary-500 transition-colors mb-2" />
              <p className="text-xs text-gray-500 text-center font-medium px-4">
                {isUploading ? "Uploading..." : "Click or drag to upload a header photo"}
              </p>
            </>
          )}
          <input
            type="file"
            onChange={handleFileChange}
            accept="image/jpeg,image/png"
            disabled={isUploading}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
        <div className="mt-2 flex justify-end">
          <GooglePhotosPicker
            maxItems={1}
            onSelect={(urls) => {
              if (urls[0]) {
                setFormData((prev) => ({ ...prev, headerPhoto: urls[0] }));
              }
            }}
          />
        </div>
      </div>

      <div>
        <label htmlFor="summary" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
          <AlignLeft size={14} /> Summary
        </label>
        <textarea
          id="summary"
          name="summary"
          rows={4}
          value={formData.summary}
          onChange={handleChange}
          placeholder="Briefly describe this trip..."
          className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
        />
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-3 px-6 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-[0.98]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || isUploading}
          className="flex-[2] py-3 px-6 bg-primary-600 text-white rounded-lg font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Add Trip"}
        </button>
      </div>
    </form>
  );
}
