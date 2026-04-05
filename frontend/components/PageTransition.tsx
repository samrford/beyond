"use client";

import { useEffect, useState, ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  delay?: number;
}

export default function PageTransition({ children, delay = 0 }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`
        w-full h-full
        transition-all 
        duration-1000 
        ease-premium-reveal
        ${isVisible 
          ? "opacity-100 scale-100" 
          : "opacity-0 scale-[0.97] pointer-events-none"}
      `}
    >
      {children}
    </div>
  );
}
