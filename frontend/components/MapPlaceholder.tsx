<<<<<<< HEAD
"use client";

import { Map as MapIcon } from "lucide-react";

export default function MapPlaceholder() {
  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-8 text-center">
      <div className="bg-white dark:bg-gray-700 p-4 rounded-full shadow-sm mb-4">
        <MapIcon size={40} className="text-primary-500" />
      </div>
      <h3 className="text-xl font-bold mb-2">Map View Coming Soon</h3>
      <p className="max-w-md">
        This area will soon feature an interactive map showing all your itinerary destinations and planned routes.
      </p>
      <div className="mt-6 flex gap-2">
        <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs font-medium">Google Maps</span>
        <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs font-medium">MapBox</span>
        <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs font-medium">OpenStreetMap</span>
      </div>
=======
import { Map } from "lucide-react";

export default function MapPlaceholder() {
  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center p-8 text-center transition-colors">
      <div className="bg-white dark:bg-gray-700 p-4 rounded-full shadow-md mb-4 text-primary-500">
        <Map size={48} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
        Map View (Coming Soon)
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm">
        This area is reserved for the interactive map. Once integrated, you&apos;ll see all your planned items pinned geographically, adjusting based on which day you select in your itinerary.
      </p>
>>>>>>> origin/master
    </div>
  );
}
