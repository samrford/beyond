"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function CountdownBadge() {
  const [nextPlan, setNextPlan] = useState<{ name: string; startDate: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/plans`);
        if (!response.ok) throw new Error("Failed to fetch plans");
        const plans = await response.json();

        const now = new Date();
        const futurePlans = plans
          .filter((plan: any) => new Date(plan.startDate) > now)
          .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

        if (futurePlans.length > 0) {
          setNextPlan({
            name: futurePlans[0].name,
            startDate: futurePlans[0].startDate
          });
        }
      } catch (error) {
        console.error("Error fetching plans for countdown:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    if (!nextPlan) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(nextPlan.startDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft(null);
        setNextPlan(null); // Simple way to refresh or hide
        clearInterval(timer);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft({ days, hours, minutes });
    }, 1000);

    return () => clearInterval(timer);
  }, [nextPlan]);

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-bold mb-8 border border-primary-100 dark:border-primary-800 shadow-sm animate-pulse">
        <Compass size={16} />
        <span>Finding your next adventure...</span>
      </div>
    );
  }

  if (!nextPlan || !timeLeft) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-bold mb-8 border border-primary-100 dark:border-primary-800 shadow-sm">
        <Compass size={16} />
        <span>
          No upcoming trips yet, let&apos;s change that and{" "}
          <Link href="/plans" className="underline hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
            make a plan
          </Link>!
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-bold mb-8 border border-orange-100 dark:border-orange-800 shadow-sm">
      <Compass size={16} className="animate-pulse" />
      <span>
        {timeLeft.days} days, {timeLeft.hours} hours, {timeLeft.minutes} minutes until {nextPlan.name}!
      </span>
    </div>
  );
}
