"use client";

import { useState, useEffect, useRef } from "react";
import { X, Clock, MapPin, AlignLeft, Globe } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";
import RichTextEditor from "./RichTextEditor";
import TimePicker from "./TimePicker";

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
  onStartLocationSelection?: () => void;
  isSelectingLocation?: boolean;
}

const extractHHMM = (timeStr: string | null) => {
  if (!timeStr) return "";
  if (timeStr.includes("T")) {
    return timeStr.split("T")[1].slice(0, 5);
  }
  return timeStr.slice(0, 5);
};

export default function PlanItemModal({
  item,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onStartLocationSelection,
  isSelectingLocation = false
}: PlanItemModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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
      setShowDeleteConfirm(false);
      setIsDirty(false);
    }
  }, [isOpen, item.id, item.name, item.description, item.location, item.latitude, item.longitude, item.duration, item.startTime]); // Satisfy ESLint while maintaining business logic

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsDirty(true);
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDescriptionChange = (html: string) => {
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, description: html }));
  };

  const handleClose = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
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
      setIsDirty(false);
      toast.success("Activity saved!");
      onClose();
    } catch (error) {
      console.error("Failed to save item:", error);
      toast.error("Failed to save activity");
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
    <div className="absolute inset-0 z-50 flex items-start justify-center p-4 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-sm animate-in slide-in-from-left duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 flex flex-col max-h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="p-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 rounded-lg">
              <Clock size={18} />
            </span>
            Configure Activity
          </h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          {/* Activity Name */}
          <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-gray-100 dark:border-gray-800 space-y-3">
            <label className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">
              Activity
            </label>
            <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 focus-within:border-primary-500 transition-all">
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Afternoon at the Colosseum"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-transparent rounded-xl text-sm font-medium text-gray-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Duration */}
            <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-gray-100 dark:border-gray-800 space-y-3">
              <label className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                Duration (Mins)
              </label>
              <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 focus-within:border-primary-500 transition-all">
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-transparent rounded-xl text-sm font-medium text-gray-900 dark:text-white outline-none"
                />
              </div>
            </div>

            {/* Start Time */}
            <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-gray-100 dark:border-gray-800 space-y-3 relative overflow-hidden">
              <label className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter flex justify-between items-center group">
                Start Time
                {calculateEndTime() && (
                  <span className="ml-2 text-[8px] opacity-50">ENDS {calculateEndTime()}</span>
                )}
              </label>
              <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 focus-within:border-primary-500 transition-all">
                <TimePicker
                  value={formData.startTime}
                  onChange={(v) => {
                    setIsDirty(true);
                    setFormData((prev) => ({ ...prev, startTime: v }));
                  }}
                  disabled={isScratchpad}
                />
              </div>
              {isScratchpad && <div className="absolute inset-0 bg-gray-100/10 dark:bg-gray-900/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none" />}
            </div>
          </div>

          {/* Location */}
          <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-gray-100 dark:border-gray-800 space-y-3">
            <label className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">
              Location name
            </label>
            <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 focus-within:border-primary-500 transition-all">
              <input
                type="text"
                name="location"
                placeholder="e.g. Colosseum, Rome"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-transparent rounded-xl text-sm font-medium text-gray-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Coordinates */}
          <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-gray-100 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                Coordinates (Lat/Long)
              </label>
              <button
                type="button"
                onClick={onStartLocationSelection}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isSelectingLocation
                  ? "bg-primary-500 text-white animate-pulse"
                  : "bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 hover:scale-105"
                  }`}
              >
                {isSelectingLocation ? "Click map to set location" : "Select on map"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 focus-within:border-primary-500 transition-all">
                <input
                  type="text"
                  name="latitude"
                  placeholder="Latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-transparent rounded-xl text-xs font-mono text-gray-900 dark:text-white outline-none"
                />
              </div>
              <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 focus-within:border-primary-500 transition-all">
                <input
                  type="text"
                  name="longitude"
                  placeholder="Longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-transparent rounded-xl text-xs font-mono text-gray-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Description (Rich Text) */}
          <div className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-gray-100 dark:border-gray-800 space-y-3">
            <label className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">
              Description
            </label>
            <RichTextEditor
              key={item.id}
              initialValue={item.description || ""}
              onChange={handleDescriptionChange}
              placeholder="Describe your activity..."
              className="min-h-[120px]"
            />
          </div>
        </form>

        <div className="px-6 py-5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end items-center gap-4 rounded-b-xl">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-8 py-3 bg-primary-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary-500/30 hover:bg-primary-700 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? "Syncing..." : "Save Activity"}
          </button>
        </div>

        {onDelete && item.id && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/30 flex justify-center">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 uppercase tracking-widest"
            >
              Delete Activity
            </button>
          </div>
        )}

        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Delete Activity"
          message="Are you sure you want to permanently delete this itinerary item?"
          onConfirm={() => {
            if (onDelete && item.id) {
              onDelete(item.id);
            }
            setShowDeleteConfirm(false);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />

        <ConfirmModal
          isOpen={showCancelConfirm}
          title="Discard changes?"
          message="You have unsaved changes. If you close now, they'll be lost."
          confirmLabel="Discard changes"
          onConfirm={() => {
            setShowCancelConfirm(false);
            onClose();
          }}
          onCancel={() => setShowCancelConfirm(false)}
        />
      </div>
    </div>
  );
}
