"use client";

import { useState, FormEvent, useRef } from "react";
import { Upload, X, Trash2 } from "lucide-react";
import { useUpload } from "@/hooks/useUpload";

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

  const { uploadFile, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadFile(file);
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
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const submissionData = {
      ...formData,
      timestamp: formData.timestamp ? new Date(formData.timestamp).toISOString() : new Date().toISOString(),
    };

    await onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Event Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            required
            value={formData.location}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Time
          </label>
          <input
            type="datetime-local"
            id="timestamp"
            name="timestamp"
            required
            value={formData.timestamp}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Brief Description
        </label>
        <input
          type="text"
          id="description"
          name="description"
          required
          value={formData.description}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Photos
        </label>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
          {formData.photos.map((photo, index) => (
            <div key={index} className="relative aspect-video rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
              <img 
                src={photo} 
                alt={`Photo ${index + 1}`} 
                className="object-cover w-full h-full"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                title="Remove photo"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          
          <div 
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`aspect-video flex flex-col justify-center items-center border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md cursor-pointer hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
              isUploading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Upload size={24} className="text-gray-400 mb-1" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isUploading ? "Uploading..." : "Add Photo"}
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

      <div>
        <label htmlFor="journal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Journal Entry
        </label>
        <textarea
          id="journal"
          name="journal"
          rows={5}
          value={formData.journal}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
