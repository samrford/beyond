"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker, type DayButtonProps, type MonthCaptionProps } from "react-day-picker";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  minDate?: Date;
  maxDate?: Date;
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function MonthCaption({ calendarMonth, displayIndex, className, children, ...divProps }: MonthCaptionProps) {
  const today = new Date();
  const date = calendarMonth.date;
  const isCurrentMonth =
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  const colorClass = isCurrentMonth
    ? "text-primary-600 dark:text-primary-400"
    : "text-gray-900 dark:text-white";
  return (
    <div {...divProps} className={`${className ?? ""} ${colorClass}`}>
      {children}
    </div>
  );
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

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select a date",
  id,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = value
    ? new Date(Number(value.split("-")[0]), Number(value.split("-")[1]) - 1, Number(value.split("-")[2]))
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

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      onChange(`${y}-${m}-${d}`);
    }
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-left flex items-center justify-between gap-2 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
      >
        <span className={value ? "text-gray-900 dark:text-white text-sm" : "text-gray-400 text-sm"}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Calendar size={15} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected ?? minDate ?? maxDate}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
            showOutsideDays
            components={{ DayButton, MonthCaption }}
            classNames={{
              root: "p-3 w-[280px]",
              months: "",
              month: "space-y-2",
              month_caption: "flex justify-center items-center h-8 mb-1",
              caption_label: "text-sm font-semibold",
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
        </div>
      )}
    </div>
  );
}
