"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import { getImageUrl } from "@/lib/api";

interface Checkpoint {
  id: string;
  name: string;
  location: string;
  timestamp: string;
  description: string;
  photos: string[];
  journal: string;
}

interface CheckpointCardProps {
  checkpoint: Checkpoint;
  index: number;
  tripId: string;
  onDelete: (id: string) => void;
}

export default function CheckpointCard({ checkpoint, index, tripId, onDelete }: CheckpointCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };


  return (
    <div className="relative pl-8 border-l-2 border-primary-200 dark:border-primary-800">
      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary-500 dark:bg-primary-400 cursor-pointer hover:bg-primary-600 dark:hover:bg-primary-500 transition-colors" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{checkpoint.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{checkpoint.location}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Link 
                href={`/trip/${tripId}/checkpoint/${checkpoint.id}/edit`}
                className="hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 p-1.5 rounded-full transition-colors"
                title="Edit Checkpoint"
              >
                <Pencil size={18} />
              </Link>
              <button 
                onClick={() => onDelete(checkpoint.id)}
                className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-full transition-colors"
                title="Delete Checkpoint"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {new Date(checkpoint.timestamp).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-2">{checkpoint.description}</p>
        
        {checkpoint.photos && checkpoint.photos.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
            {checkpoint.photos.map((photo, i) => (
              <div key={i} className="relative h-32 w-48 flex-shrink-0">
                <Image
                  src={getImageUrl(photo)}
                  alt={`${checkpoint.name} ${i + 1}`}
                  fill
                  className="object-cover rounded shadow-sm"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}
        
        <p className="text-gray-500 dark:text-gray-400 italic mb-3">&quot;{checkpoint.journal}&quot;</p>
        
        {/* Expand/Collapse Button */}
        <button
          onClick={toggleExpand}
          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium flex items-center gap-1 transition-colors"
        >
          {isExpanded ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Show less
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Show more
            </>
          )}
        </button>
        
        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-fadeIn">
            {/* Additional Photos Section */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">More Photos</h4>
              <div className="grid grid-cols-2 gap-2">
                {checkpoint.photos.slice(0, 4).map((photo, i) => (
                  <div key={i} className="relative h-40 w-full">
                    <Image
                      src={getImageUrl(photo)}
                      alt={`${checkpoint.name} additional ${i + 1}`}
                      fill
                      className="object-cover rounded shadow-sm hover:shadow-md transition-shadow"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Extended Journal Entry */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Full Journal Entry</h4>
              <p className="text-gray-600 dark:text-gray-300 italic">{checkpoint.journal}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
