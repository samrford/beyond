"use client";

import { useState } from "react";

// Get API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

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
}

export default function CheckpointCard({ checkpoint, index }: CheckpointCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const getImageUrl = (photoPath: string) => {
    if (photoPath.startsWith("/api/image")) {
      return `${API_BASE_URL}${photoPath}`;
    }
    return photoPath;
  };

  return (
    <div className="relative pl-8 border-l-2 border-primary-200">
      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary-500 cursor-pointer hover:bg-primary-600 transition-colors" />
      
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{checkpoint.name}</h3>
            <p className="text-sm text-gray-500">{checkpoint.location}</p>
          </div>
          <span className="text-sm text-gray-400">
            {new Date(checkpoint.timestamp).toLocaleDateString()}
          </span>
        </div>
        
        <p className="text-gray-600 mb-2">{checkpoint.description}</p>
        
        {checkpoint.photos && checkpoint.photos.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
            {checkpoint.photos.map((photo, i) => (
              <img
                key={i}
                src={getImageUrl(photo)}
                alt={`${checkpoint.name} ${i + 1}`}
                className="h-32 w-48 object-cover rounded shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ))}
          </div>
        )}
        
        <p className="text-gray-500 italic mb-3">"{checkpoint.journal}"</p>
        
        {/* Expand/Collapse Button */}
        <button
          onClick={toggleExpand}
          className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 transition-colors"
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
          <div className="mt-4 pt-4 border-t border-gray-100 animate-fadeIn">
            {/* Additional Photos Section */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">More Photos</h4>
              <div className="grid grid-cols-2 gap-2">
                {checkpoint.photos.slice(0, 4).map((photo, i) => (
                  <img
                    key={i}
                    src={getImageUrl(photo)}
                    alt={`${checkpoint.name} additional ${i + 1}`}
                    className="h-40 w-full object-cover rounded shadow-sm hover:shadow-md transition-shadow"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Extended Journal Entry */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Full Journal Entry</h4>
              <p className="text-gray-600 italic">{checkpoint.journal}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
