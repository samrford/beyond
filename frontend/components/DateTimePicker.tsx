"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker, type DayButtonProps } from "react-day-picker";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface DateTimePickerProps {
  value: string; // YYYY-MM-DDTHH:mm
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

function formatDisplay(dateTimeStr: string): string {
  if (!dateTimeStr) return "";
  try {
    const [datePart, timePart] = dateTimeStr.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const dateLabel = new Date(year, month - 1, day).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return timePart ? `${dateLabel} at ${timePart}` : dateLabel;
  } catch {
    return "";
  }
}

function DayButton({ day, modifiers, onClick, ...props }: DayButtonProps) {
  const base =
    "w-9 h-9 rounded-full text-sm flex items-center justify-center transition-colors cursor-pointer focus:outline-none";
  const stateClass = modifiers.selected
    ? "bg-primary-600 text-white hover:bg-primary-700 font-semibold"
    : modifiers.outside
    ? "text-gray-300 dark:text-gray-600 hover:bg-transparent cursor-default"
    : modifiers.disabled
    ? "text-gray-300 dark:text-gray-600 cursor-not-allowed pointer-events-none"
    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700";
  const todayClass =
    modifiers.today && !modifiers.selected
      ? "font-bold text-primary-600 dark:text-primary-400"
      : "";

  return (
    <button
      {...props}
      onClick={onClick}
      className={[base, stateClass, todayClass].filter(Boolean).join(" ")}
    />
  );
}

export default function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const datePart = value ? value.split("T")[0] : "";
  const timePart = value ? (value.split("T")[1] ?? "00:00") : "00:00";

  const selected = datePart
    ? new Date(
        Number(datePart.split("-")[0]),
        Number(datePart.split("-")[1]) - 1,
        Number(datePart.split("-")[2])
      )
    : undefined;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectDate = (date: Date | undefined) => {
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      onChange(`${y}-${m}-${d}T${timePart}`);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(`${datePart || new Date().toISOString().split("T")[0]}T${e.target.value}`);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-transparent px-4 py-3 rounded-xl focus:outline-none text-sm font-medium text-gray-900 dark:text-white text-left flex items-center justify-between gap-2"
      >
        <span className={value ? "text-gray-900 dark:text-white" : "text-gray-400"}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Calendar size={15} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelectDate}
            defaultMonth={selected}
            showOutsideDays
            components={{ DayButton }}
            classNames={{
              root: "p-3 w-[280px]",
              months: "",
              month: "space-y-2",
              month_caption: "flex justify-center items-center h-8 mb-1",
              caption_label: "text-sm font-semibold text-gray-900 dark:text-white",
              nav: "absolute inset-x-0 flex justify-between px-1 pointer-events-none",
              button_previous:
                "pointer-events-auto h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
              button_next:
                "pointer-events-auto h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
              month_grid: "w-full border-collapse",
              weekdays: "grid grid-cols-7",
              weekday:
                "text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1",
              week: "grid grid-cols-7",
              day: "flex items-center justify-center p-0",
              day_button: "",
            }}
          />
          {/* Time row */}
          <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700 pt-3">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              <Clock size={12} /> Time
            </label>
            <input
              type="time"
              value={timePart}
              onChange={handleTimeChange}
              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
