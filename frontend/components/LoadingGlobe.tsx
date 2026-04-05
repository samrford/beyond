"use client";

import { Globe } from "lucide-react";

interface LoadingGlobeProps {
  fullScreen?: boolean;
  message?: string;
}

export default function LoadingGlobe({ fullScreen = false, message = "Loading adventure..." }: LoadingGlobeProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in duration-700">
      <div className="relative">
        {/* Outer Glow */}
        <div className="absolute inset-0 bg-primary-400/30 blur-2xl rounded-full animate-pulse-slow" />
        
        {/* Pulsing Globe */}
        <div className="relative bg-white dark:bg-gray-800 p-6 rounded-full shadow-2xl border border-gray-100 dark:border-gray-700">
          <Globe 
            size={64} 
            className="text-primary-600 dark:text-primary-400 animate-spin-slow" 
          />
        </div>
        
        {/* Orbiting Ring (Optional Detail) */}
        <div className="absolute inset-[-10px] border-2 border-primary-500/20 rounded-full animate-reverse-spin-slow" />
      </div>
      
      {message && (
        <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide flex items-center gap-2">
          {message}
          <span className="flex gap-1">
            <span className="w-1 h-1 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-1 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-1 bg-primary-400 rounded-full animate-bounce" />
          </span>
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full min-h-[400px]">
      {content}
    </div>
  );
}
