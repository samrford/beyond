"use client";

import React from "react";
import { X, Loader2 } from "lucide-react";
import CheckpointForm from "./CheckpointForm";

interface Checkpoint {
  id: string;
  name: string;
  location: string;
  timestamp: string;
  description: string;
  photos: string[];
  journal: string;
}

interface CheckpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkpoint: Checkpoint | null;
  onSubmit: (data: any) => Promise<void>;
  isSaving: boolean;
  title: string;
}

export default function CheckpointModal({
  isOpen,
  onClose,
  checkpoint,
  onSubmit,
  isSaving,
  title,
}: CheckpointModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          {(!checkpoint && title.includes("Edit")) ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-primary-500 animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading checkpoint details...</p>
            </div>
          ) : (
            <CheckpointForm
              initialData={checkpoint}
              onSubmit={onSubmit}
              onCancel={onClose}
              isLoading={isSaving}
            />
          )}
        </div>

        {isSaving && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex flex-col items-center justify-center z-[60] rounded-xl backdrop-blur-[1px]">
            <Loader2 className="h-10 w-10 text-primary-600 animate-spin mb-2" />
            <p className="font-bold text-primary-700 dark:text-primary-400">Saving Changes...</p>
          </div>
        )}
      </div>
    </div>
  );
}
