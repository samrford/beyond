"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useUpload } from "@/app/hooks/useUpload";
import { Upload, X, Calendar, MapPin, AlignLeft } from "lucide-react";

interface PlanFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
}

export default function PlanForm({ initialData, onSubmit, isLoading }: PlanFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    summary: "",
    coverPhoto: "",
  });

  const { upload, uploading, previewUrl } = useUpload();

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : "",
        endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : "",
        summary: initialData.summary || "",
        coverPhoto: initialData.coverPhoto || "",
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await upload(file);
      if (url) {
        setFormData((prev) => ({ ...prev, coverPhoto: url }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = {
      ...formData,
      startDate: formData.startDate ? `${formData.startDate}T00:00:00Z` : "",
      endDate: formData.endDate ? `${formData.endDate}T00:00:00Z` : "",
    };
    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
          Plan Name
        </label>
        <input
          type="text"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Summer Vacation in Italy"
          className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
            <Calendar size={14} /> Start Date
          </label>
          <input
            type="date"
            name="startDate"
            required
            value={formData.startDate}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
            <Calendar size={14} /> End Date
          </label>
          <input
            type="date"
            name="endDate"
            required
            value={formData.endDate}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
          Cover Photo
        </label>
        <div className="relative group overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 aspect-video flex flex-col items-center justify-center transition-all hover:border-primary-500 active:scale-[0.98]">
           {(previewUrl || formData.coverPhoto) ? (
             <>
               <Image 
                 src={previewUrl || formData.coverPhoto} 
                 alt="Preview" 
                 fill
                 className="object-cover group-hover:scale-105 transition-transform duration-500"
               />
               <button 
                 type="button" 
                 onClick={() => { setFormData(prev => ({...prev, coverPhoto: ""})) }}
                 className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
               >
                 <X size={16} />
               </button>
             </>
           ) : (
             <>
               <Upload size={32} className="text-gray-400 group-hover:text-primary-500 transition-colors mb-2" />
               <p className="text-xs text-gray-500 text-center font-medium px-4">
                 {uploading ? "Uploading..." : "Click or drag to upload a cover photo"}
               </p>
             </>
           )}
           <input 
             type="file" 
             accept="image/*"
             onChange={handleFileChange}
             disabled={uploading}
             className="absolute inset-0 opacity-0 cursor-pointer"
           />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
          <AlignLeft size={14} /> Summary
        </label>
        <textarea
          name="summary"
          rows={4}
          value={formData.summary}
          onChange={handleChange}
          placeholder="Briefly describe what you're planning for this adventure..."
          className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
        />
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex-1 py-3 px-6 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-[0.98]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || uploading}
          className="flex-[2] py-3 px-6 bg-primary-600 text-white rounded-lg font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isLoading ? "Saving..." : (initialData ? "Update Plan" : "Create Plan")}
        </button>
      </div>
    </form>
  );
}
