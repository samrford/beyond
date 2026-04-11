"use client";

import dynamic from "next/dynamic";
import { Map as MapIcon } from "lucide-react";

import 'leaflet/dist/leaflet.css';

// Dynamically import Leaflet with no SSR since it requires the window object
const OSMRoute = dynamic(() => import("@/components/maps/OSMRoute"), { ssr: false, loading: () => <MapLoading /> });

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

// Utility to convert time string to minutes for comparison
const getTimeInMinutes = (timeStr: string | null) => {
  if (!timeStr) return null;
  let timePart = timeStr;
  if (timeStr.includes("T")) {
    timePart = timeStr.split("T")[1];
  }
  const parts = timePart.split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

// Sort items by time, then by orderIndex
const sortPlanItems = (items: any[]) => {
  return [...items].sort((a, b) => {
    const timeA = getTimeInMinutes(a.startTime);
    const timeB = getTimeInMinutes(b.startTime);

    if (timeA === null && timeB === null) return (a.orderIndex || 0) - (b.orderIndex || 0);
    if (timeA === null) return 1;
    if (timeB === null) return -1;
    return timeA - timeB;
  });
};

export default function InteractiveMap({
  plan,
  selectedDayId,
  selectedItemId,
  isSelectingLocation = false,
  onMapClick,
  onItemSelect
}: {
  plan: any,
  selectedDayId: string | null, 
  selectedItemId: string | null,
  isSelectingLocation?: boolean,
  onMapClick?: (lat: number, lng: number) => void,
  onItemSelect?: (id: string) => void
}) {
  const displayItems = () => {
    if (!plan) return [];
    let rawItems: any[] = [];
    
    if (selectedDayId) {
      const day = plan.days?.find((d: any) => d.id === selectedDayId);
      rawItems = day?.items || [];
    } else {
      // Aggregate all items assigned to days
      rawItems = (plan.days || []).flatMap((d: any) => d.items || []);
    }
    
    // Always sort by time for the map route
    return sortPlanItems(rawItems);
  };

  const items = displayItems();

  return (
    <div className="w-full h-full relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-inner group">

      {/* Map Renderer Container */}
      <div className={`w-full h-full ${isSelectingLocation ? 'cursor-crosshair' : ''}`}>
        <OSMRoute
          items={items}
          selectedItemId={selectedItemId}
          onMapClick={onMapClick}
          isSelectingLocation={isSelectingLocation}
          onItemSelect={onItemSelect}
        />
      </div>

      {items.length === 0 && (
        <div className="absolute inset-0 z-[1000] pointer-events-none flex items-center justify-center">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur px-4 py-2 rounded-lg shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No locations to display for this view</p>
          </div>
        </div>
      )}
    </div>
  );
}
