"use client";

import { useState } from "react";
import { Check, Palette, X } from "lucide-react";
import AuthImage from "./AuthImage";
import type { TripBgMode } from "@/lib/queries/trips";

type PatternMode = Exclude<TripBgMode, "default" | "ambient">;

const PATTERNS_DARK: Record<PatternMode, string> = {
  topo: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'><g fill='none' stroke='%23ffffff' stroke-opacity='0.07' stroke-width='1'><circle cx='120' cy='120' r='30'/><circle cx='120' cy='120' r='55'/><circle cx='120' cy='120' r='80'/><circle cx='120' cy='120' r='105'/><circle cx='120' cy='120' r='130'/></g></svg>")`,
  dots: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><circle cx='2' cy='2' r='1.2' fill='%23ffffff' fill-opacity='0.10'/></svg>")`,
  diagonal: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M0 40 L40 0 M-10 10 L10 -10 M30 50 L50 30' stroke='%23ffffff' stroke-opacity='0.06' stroke-width='1' fill='none'/></svg>")`,
  grid: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><path d='M0 0 H32 M0 0 V32' stroke='%23ffffff' stroke-opacity='0.05' stroke-width='1'/></svg>")`,
  waves: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='40'><path d='M0 20 Q 20 0, 40 20 T 80 20' fill='none' stroke='%23ffffff' stroke-opacity='0.07' stroke-width='1'/></svg>")`,
};

const PATTERNS_LIGHT: Record<PatternMode, string> = {
  topo: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'><g fill='none' stroke='%23000000' stroke-opacity='0.07' stroke-width='1'><circle cx='120' cy='120' r='30'/><circle cx='120' cy='120' r='55'/><circle cx='120' cy='120' r='80'/><circle cx='120' cy='120' r='105'/><circle cx='120' cy='120' r='130'/></g></svg>")`,
  dots: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><circle cx='2' cy='2' r='1.2' fill='%23000000' fill-opacity='0.12'/></svg>")`,
  diagonal: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M0 40 L40 0 M-10 10 L10 -10 M30 50 L50 30' stroke='%23000000' stroke-opacity='0.07' stroke-width='1' fill='none'/></svg>")`,
  grid: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><path d='M0 0 H32 M0 0 V32' stroke='%23000000' stroke-opacity='0.06' stroke-width='1'/></svg>")`,
  waves: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='40'><path d='M0 20 Q 20 0, 40 20 T 80 20' fill='none' stroke='%23000000' stroke-opacity='0.08' stroke-width='1'/></svg>")`,
};

const MODES: { id: TripBgMode; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "ambient", label: "Ambient" },
  { id: "topo", label: "Topo" },
  { id: "dots", label: "Dots" },
  { id: "diagonal", label: "Diagonal" },
  { id: "grid", label: "Grid" },
  { id: "waves", label: "Waves" },
];

const AMBIENT_DEFAULTS = { blur: 20, opacity: 100, darkness: 10 };

export interface TripBackgroundValue {
  mode: TripBgMode;
  blur: number;
  opacity: number;
  darkness: number;
}

export default function TripBackground({
  imageUrl,
  value,
  onChange,
  isDirty,
  isSaving,
  onSave,
}: {
  imageUrl: string | null | undefined;
  value: TripBackgroundValue;
  onChange: (next: TripBackgroundValue) => void;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
}) {
  const { mode, blur, opacity, darkness } = value;
  const [open, setOpen] = useState(false);

  const setMode = (m: TripBgMode) => onChange({ ...value, mode: m });
  const setBlur = (v: number) => onChange({ ...value, blur: v });
  const setOpacity = (v: number) => onChange({ ...value, opacity: v });
  const setDarkness = (v: number) => onChange({ ...value, darkness: v });

  const patternKey: PatternMode | null =
    mode !== "default" && mode !== "ambient" ? mode : null;

  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden
      >
        {mode !== "default" && (
          <div className="absolute inset-0 bg-gray-50 dark:bg-gray-950" />
        )}

        {mode === "ambient" && imageUrl && (
          <>
            <AuthImage
              src={imageUrl}
              alt=""
              fill
              className="scale-125"
              style={{
                filter: `blur(${blur}px)`,
                opacity: opacity / 100,
              }}
            />
            <div
              className="absolute inset-0 dark:hidden"
              style={{
                backgroundImage: `linear-gradient(to bottom, rgba(249,250,251,${(0.3 * darkness) / 100}), rgba(249,250,251,${(0.65 * darkness) / 100}), rgba(249,250,251,${(0.85 * darkness) / 100}))`,
              }}
            />
            <div
              className="absolute inset-0 hidden dark:block"
              style={{
                backgroundImage: `linear-gradient(to bottom, rgba(3,7,18,${(0.3 * darkness) / 100}), rgba(3,7,18,${(0.65 * darkness) / 100}), rgba(3,7,18,${(0.88 * darkness) / 100}))`,
              }}
            />
          </>
        )}

        {patternKey && (
          <>
            <div
              className="absolute inset-0 dark:hidden"
              style={{ backgroundImage: PATTERNS_LIGHT[patternKey] }}
            />
            <div
              className="absolute inset-0 hidden dark:block"
              style={{ backgroundImage: PATTERNS_DARK[patternKey] }}
            />
          </>
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-40 flex items-end gap-2">
        {open && (
          <div className="w-72 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-lg shadow-xl p-3 border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex flex-wrap gap-1">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors ${
                    mode === m.id
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {mode === "ambient" && (
              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <SliderRow
                  label="Blur"
                  value={blur}
                  min={20}
                  max={200}
                  step={4}
                  unit="px"
                  onChange={setBlur}
                />
                <SliderRow
                  label="Photo opacity"
                  value={opacity}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onChange={setOpacity}
                />
                <SliderRow
                  label="Darkness"
                  value={darkness}
                  min={0}
                  max={150}
                  step={1}
                  unit="%"
                  onChange={setDarkness}
                />
                <button
                  onClick={() =>
                    onChange({
                      mode: "ambient",
                      blur: AMBIENT_DEFAULTS.blur,
                      opacity: AMBIENT_DEFAULTS.opacity,
                      darkness: AMBIENT_DEFAULTS.darkness,
                    })
                  }
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Reset
                </button>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isSaving
                  ? "Saving…"
                  : isDirty
                    ? "Unsaved changes"
                    : "Saved"}
              </span>
              <button
                onClick={onSave}
                disabled={!isDirty || isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {!isDirty && !isSaving && <Check size={14} />}
                Save
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-full shadow-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          title="Background style"
        >
          {open ? <X size={18} /> : <Palette size={18} />}
        </button>
      </div>
    </>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
        <span>{label}</span>
        <span className="tabular-nums text-gray-500 dark:text-gray-400">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary-600"
      />
    </label>
  );
}

export function tripBackgroundIsDirty(
  a: TripBackgroundValue,
  b: TripBackgroundValue,
): boolean {
  return (
    a.mode !== b.mode ||
    a.blur !== b.blur ||
    a.opacity !== b.opacity ||
    a.darkness !== b.darkness
  );
}
