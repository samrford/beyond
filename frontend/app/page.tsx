import Link from "next/link";
import { Compass, Plane, Map, ArrowRight } from "lucide-react";
import CountdownBadge from "../components/CountdownBadge";
import StatsBadge from "../components/StatsBadge";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-transparent">
      <div className="text-center max-w-4xl z-10">
        <CountdownBadge />

        <h1 className="text-6xl lg:text-8xl font-black mb-8 tracking-tight">
          Explore <span className="text-gradient">Beyond</span>
        </h1>

        <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          Catalog your journeys, plan future expeditions, and share your traveling adventures.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Link
            href="/plans"
            className="group relative inline-flex items-center gap-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-800 px-10 py-4 rounded-2xl text-xl font-bold hover:border-primary-600 dark:hover:border-primary-500 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95"
          >
            <Map size={24} className="text-primary-600 dark:text-primary-400" />
            Plan a Trip
            <ArrowRight size={20} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
          </Link>

          <Link
            href="/trips"
            className="group relative inline-flex items-center gap-3 bg-primary-600 text-white px-10 py-4 rounded-2xl text-xl font-bold hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 hover:shadow-2xl hover:shadow-primary-500/40 hover:-translate-y-1 active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Plane size={24} />
            View My Trips
          </Link>
        </div>
      </div>

      <StatsBadge />
    </main>
  );
}
