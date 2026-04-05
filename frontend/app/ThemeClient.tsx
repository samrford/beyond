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

export default function ThemeClient({
  children,
  initialState = { theme: "system" },
}: {
  children: React.ReactNode;
  initialState?: { theme: Theme };
}) {
  const [theme, setTheme] = useState<Theme>(initialState.theme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const handleThemeChange = (currentTheme: Theme) => {
      if (currentTheme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setResolvedTheme(prefersDark ? "dark" : "light");
      } else {
        setResolvedTheme(currentTheme);
      }
    };

    handleThemeChange(theme);

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? "dark" : "light");
      };
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, [theme]);

  const value = {
    theme,
    setTheme,
    resolvedTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <html
        lang="en"
        data-theme={resolvedTheme}
        className={resolvedTheme === "dark" ? "dark" : ""}
      >
        <head />
        <body className="antialiased text-gray-900 bg-white dark:bg-gray-900 dark:text-gray-100 min-h-screen">
          {children}
        </body>
      </html>
    </ThemeContext.Provider>
  );
}
