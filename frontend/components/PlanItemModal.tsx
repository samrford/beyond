"use client";

import { useState, useEffect } from "react";
import { X, Clock, MapPin, AlignLeft, Globe } from "lucide-react";

interface PlanItem {
  id: string;
  planId: string;
  planDayId: string | null;
  name: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  orderIndex: number;
  estimatedTime: string;
  startTime: string | null;
  duration: number;
}

interface PlanItemModalProps {
  item: PlanItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: Partial<PlanItem>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function PlanItemModal({ item, isOpen, onClose, onSave, onDelete }: PlanItemModalProps) {
  const extractHHMM = (timeStr: string | null) => {
    if (!timeStr) return "";
    if (timeStr.includes("T")) {
      return timeStr.split("T")[1].slice(0, 5);
    }
    return timeStr.slice(0, 5);
  };

  const [formData, setFormData] = useState({
    name: item.name || "",
    description: item.description || "",
    location: item.location || "",
    latitude: item.latitude?.toString() || "",
    longitude: item.longitude?.toString() || "",
    duration: item.duration || 0,
    startTime: extractHHMM(item.startTime),
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: item.name || "",
        description: item.description || "",
        location: item.location || "",
        latitude: item.latitude?.toString() || "",
        longitude: item.longitude?.toString() || "",
        duration: item.duration || 0,
        startTime: extractHHMM(item.startTime),
      });
    }
  }, [isOpen, item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        duration: parseInt(formData.duration.toString()) || 0,
        startTime: formData.startTime ? `${formData.startTime}:00` : null,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save item:", error);
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const calculateEndTime = () => {
    if (!formData.startTime || !formData.duration) return null;
    const [hours, minutes] = formData.startTime.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0);
    date.setMinutes(date.getMinutes() + parseInt(formData.duration.toString()));
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  const isScratchpad = !item.planDayId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="p-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 rounded-lg">
               <Clock size={18} />
            </span>
            Configure Activity
          </h2>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
              Activity Name
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={isScratchpad ? "col-span-2 text-primary-600 font-medium text-xs bg-primary-50 dark:bg-primary-900/20 p-2 rounded border border-primary-100 dark:border-primary-800" : ""}>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {isScratchpad ? "Duration (Estimated Minutes)" : "Duration (Minutes)"}
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
              {isScratchpad && <p className="mt-1 text-[10px] opacity-70">Start time can be set once assigned to a day.</p>}
            </div>

            {!isScratchpad && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex justify-between">
                  Start Time
                  {calculateEndTime() && (
                    <span className="text-[10px] text-gray-400 font-normal uppercase">Ends {calculateEndTime()}</span>
                  )}
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
              <MapPin size={14} className="text-gray-400" /> Location Name
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Colosseum, Rome"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
             <div className="col-span-2 mb-1 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
               <Globe size={12} /> Coordinates (Optional)
             </div>
             <div>
               <input
                 type="text"
                 name="latitude"
                 placeholder="Latitude"
                 value={formData.latitude}
                 onChange={handleChange}
                 className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
               />
             </div>
             <div>
               <input
                 type="text"
                 name="longitude"
                 placeholder="Longitude"
                 value={formData.longitude}
                 onChange={handleChange}
                 className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
               />
             </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
              <AlignLeft size={14} className="text-gray-400" /> Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
          </div>
        </form>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Apply Changes"}
          </button>
        </div>

        {onDelete && item.id && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/30 flex justify-center">
             <button 
               type="button"
               onClick={() => {
                 if (confirm("Are you sure you want to delete this activity?")) {
                   onDelete(item.id);
                 }
               }}
               className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 uppercase tracking-widest"
             >
               Delete Activity
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
