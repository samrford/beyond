"use client";

import { usePlans } from "@/lib/queries/plans";
import { useTrips } from "@/lib/queries/trips";

export default function StatsBadge() {
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: trips, isLoading: tripsLoading } = useTrips();

  const isLoading = plansLoading || tripsLoading;
  const now = new Date();
  const completedTrips = trips?.filter((t) => new Date(t.endDate) < now).length ?? 0;

  return (
    <div className="mt-24 glass p-8 rounded-3xl border-orange-100 dark:border-orange-900/50 flex flex-wrap gap-12 justify-center items-center opacity-80 hover:opacity-100 transition-opacity">
      <div className="flex flex-col items-center gap-2">
        <span className="text-4xl font-black text-gradient">
          {isLoading ? "..." : plans?.length ?? 0}
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Plans
        </span>
      </div>

      <div className="w-px h-12 bg-gray-200 dark:bg-gray-800 hidden sm:block" />

      <div className="flex flex-col items-center gap-2">
        <span className="text-4xl font-black text-gradient">
          {isLoading ? "..." : completedTrips}
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Completed trips
        </span>
      </div>
    </div>
  );
}
