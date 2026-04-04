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
        This area is reserved for the interactive map. Once integrated, you'll see all your planned items pinned geographically, adjusting based on which day you select in your itinerary.
      </p>
    </div>
  );
}
