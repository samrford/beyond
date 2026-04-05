"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import MapboxRoute from "./maps/MapboxRoute";
import GoogleRoute from "./maps/GoogleRoute";
import { Map as MapIcon } from "lucide-react";

// Dynamically import Leaflet with no SSR since it requires the window object
const OSMRoute = dynamic(() => import("./maps/OSMRoute"), { ssr: false, loading: () => <MapLoading /> });

function MapLoading() {
  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-8 text-center transition-colors">
      <div className="bg-white dark:bg-gray-700 p-4 rounded-full shadow-sm mb-4 animate-pulse">
        <MapIcon size={40} className="text-primary-500" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
        Loading Map...
      </h3>
    </div>
  );
}

export default function InteractiveMap({ plan, selectedDayId, selectedItemId }: { plan: any, selectedDayId: string | null, selectedItemId: string | null }) {
  const [activeProvider, setActiveProvider] = useState<"mapbox" | "google" | "osm">("osm");

  // Determine which items to show based on selectedDayId.
  // If selectedDayId is null, maybe show all assigned items across days, or just empty?
  // Let's show the specific day's items. If no day selected, show everything.
  const displayItems = () => {
    if (!plan) return [];
    if (selectedDayId) {
      const day = plan.days?.find((d: any) => d.id === selectedDayId);
      return day?.items || [];
    }
    // Aggregate all items assigned to days
    const allAssigned = (plan.days || []).flatMap((d: any) => d.items || []);
    return allAssigned;
  };

  const items = displayItems();

  return (
    <div className="w-full h-full relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-inner group">
      
      {/* Map Renderer Container */}
      <div className="w-full h-[calc(100%-60px)]">
        {activeProvider === "mapbox" && <MapboxRoute items={items} selectedItemId={selectedItemId} />}
        {activeProvider === "google" && <GoogleRoute items={items} selectedItemId={selectedItemId} />}
        {activeProvider === "osm" && <OSMRoute items={items} selectedItemId={selectedItemId} />}
      </div>

      {/* Map Selection Controls */}
      <div className="absolute top-4 left-4 z-[400] flex gap-2">
        <div className="bg-white dark:bg-gray-800 p-1.5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 flex gap-1">
          <button
            onClick={() => setActiveProvider("mapbox")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeProvider === "mapbox"
                ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            MapBox
          </button>
          <button
            onClick={() => setActiveProvider("google")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeProvider === "google"
                ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Google Maps
          </button>
          <button
            onClick={() => setActiveProvider("osm")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeProvider === "osm"
                ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            OpenStreetMap
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur px-4 py-2 rounded-lg shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No locations to display for this view</p>
          </div>
        </div>
      )}
    </div>
  );
}
