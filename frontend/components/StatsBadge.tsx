"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function StatsBadge() {
  const [stats, setStats] = useState({ plans: 0, completedTrips: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [plansRes, tripsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/plans`),
          fetch(`${API_BASE_URL}/api/trips`)
        ]);

        if (!plansRes.ok || !tripsRes.ok) throw new Error("Failed to fetch statistics");

        const plans = await plansRes.json();
        const trips = await tripsRes.json();
        const now = new Date();

        setStats({
          plans: plans.length,
          completedTrips: trips.filter((t: any) => new Date(t.endDate) < now).length
        });
      } catch (error) {
        console.error("Error fetching homepage stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="mt-24 glass p-8 rounded-3xl border-orange-100 dark:border-orange-900/50 flex flex-wrap gap-12 justify-center items-center opacity-80 hover:opacity-100 transition-opacity">
      <div className="flex flex-col items-center gap-2">
        <span className="text-4xl font-black text-gradient">
          {isLoading ? "..." : stats.plans}
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Plans
        </span>
      </div>

      <div className="w-px h-12 bg-gray-200 dark:bg-gray-800 hidden sm:block" />

      <div className="flex flex-col items-center gap-2">
        <span className="text-4xl font-black text-gradient">
          {isLoading ? "..." : stats.completedTrips}
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Completed trips
        </span>
      </div>
    </div>
  );
}
