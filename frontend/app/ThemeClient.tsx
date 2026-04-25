"use client";

import { useState, useEffect, createContext, useContext } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
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
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {}
  return "system";
}

export default function ThemeClient({ children }: { children: React.ReactNode }) {
  // Start with whatever the blocking script already applied so there's no re-render flash.
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Sync state with what's already on the DOM (set by the blocking script).
  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
  }, []);

  // Keep resolvedTheme in sync and watch system preference changes.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const resolve = () => {
      if (theme === "dark") return "dark" as const;
      if (theme === "light") return "light" as const;
      return mq.matches ? "dark" as const : "light" as const;
    };

    setResolvedTheme(resolve());

    if (theme === "system") {
      const listener = () => setResolvedTheme(mq.matches ? "dark" : "light");
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, [theme]);

  // Apply class to <html> whenever resolvedTheme changes.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("theme", newTheme);
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
