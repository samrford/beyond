import { X } from "lucide-react";
import { PlanDay } from "@/lib/queries/plans";

interface GridModalProps {
  isOpen: boolean;
  onClose: () => void;
  days: PlanDay[];
  onSelectDay: (dayId: string) => void;
  selectedDayId: string | null;
}

export default function GridModal({ isOpen, onClose, days, onSelectDay, selectedDayId }: GridModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Select Day</h2>
        
        <div className="grid grid-cols-3 gap-4">
          {days.map((day, i) => (
            <button
              key={day.id}
              onClick={() => {
                onSelectDay(day.id);
                onClose();
              }}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                selectedDayId === day.id
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              <span className="text-xl font-bold">Day {i + 1}</span>
              <span className="text-sm">
                {new Date(day.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
