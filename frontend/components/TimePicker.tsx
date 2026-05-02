"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";

interface TimePickerProps {
  value: string; // HH:MM
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const DEFAULT_HOUR = "09";
const DEFAULT_MINUTE = "00";

function centerInList(list: HTMLElement | null, el: HTMLElement | null) {
  if (!list || !el) return;
  list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
}

export default function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  disabled = false,
  id,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  const [hh, mm] = value ? value.split(":") : ["", ""];

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const targetHour = hh || DEFAULT_HOUR;
    const targetMinute = MINUTES.includes(mm) ? mm : DEFAULT_MINUTE;
    const hourEl = hourListRef.current?.querySelector<HTMLButtonElement>(
      `[data-hour="${targetHour}"]`
    );
    const minEl = minuteListRef.current?.querySelector<HTMLButtonElement>(
      `[data-minute="${targetMinute}"]`
    );
    centerInList(hourListRef.current, hourEl ?? null);
    centerInList(minuteListRef.current, minEl ?? null);
  }, [open, hh, mm]);

  const pickHour = (h: string) => {
    const minute = MINUTES.includes(mm) ? mm : DEFAULT_MINUTE;
    onChange(`${h}:${minute}`);
  };

  const pickMinute = (m: string) => {
    const hour = hh || DEFAULT_HOUR;
    onChange(`${hour}:${m}`);
  };

  return (
    <>
      <div ref={triggerRef} className="relative flex items-center">
        <input
          type="time"
          id={id}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`time-picker-input w-full bg-transparent px-4 py-2 rounded-xl text-sm font-medium text-gray-900 dark:text-white outline-none ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className="shrink-0 p-2 mr-1 rounded-lg text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Open time picker"
        >
          <Clock size={15} />
        </button>
        <style jsx>{`
          .time-picker-input::-webkit-calendar-picker-indicator {
            display: none;
            -webkit-appearance: none;
          }
        `}</style>
      </div>

      {open && !disabled && position && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ top: position.top, left: position.left, width: position.width, minWidth: "11rem" }}
            className="fixed z-[60] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="grid grid-cols-2 border-b border-gray-200 dark:border-gray-700 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">
              <div className="py-1.5">Hour</div>
              <div className="py-1.5">Min</div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
              <div ref={hourListRef} className="max-h-60 overflow-y-auto p-1">
                {HOURS.map((h) => {
                  const selected = h === hh;
                  return (
                    <button
                      key={h}
                      type="button"
                      data-hour={h}
                      onClick={() => pickHour(h)}
                      className={`w-full text-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selected
                          ? "bg-primary-600 text-white font-semibold"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
              <div ref={minuteListRef} className="max-h-60 overflow-y-auto p-1">
                {MINUTES.map((m) => {
                  const selected = m === mm;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-minute={m}
                      onClick={() => pickMinute(m)}
                      className={`w-full text-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selected
                          ? "bg-primary-600 text-white font-semibold"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
