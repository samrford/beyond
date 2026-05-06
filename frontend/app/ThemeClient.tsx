"use client";

import { useState, useEffect, createContext, useContext } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light") return "light";
  } catch {}
  return "dark";
}

export default function ThemeClient({ children }: { children: React.ReactNode }) {
  // Start with whatever the blocking script already applied so there's no re-render flash.
  const [theme, setThemeState] = useState<Theme>("dark");

  // Sync state with what's already on the DOM (set by the blocking script).
  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  // Apply class to <html> whenever theme changes.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("theme", newTheme);
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
