"use client";

import { useState, useEffect } from "react";

export default function ThemeClient({
  children,
  initialState = { theme: "system" },
}: {
  children: React.ReactNode;
  initialState?: { theme: "light" | "dark" | "system" };
}) {
  const [theme, setTheme] = useState(initialState.theme);

  // Initialize theme on mount
  const [initializedTheme, setInitializedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const getInitialTheme = (theme: "light" | "dark" | "system") => {
      if (theme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return prefersDark ? "dark" : "light";
      }
      return theme;
    };
    setInitializedTheme(getInitialTheme(initialState.theme));
  }, [initialState.theme]);

  const toggleTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    if (newTheme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setInitializedTheme(prefersDark ? "dark" : "light");
    } else {
      setInitializedTheme(newTheme);
    }
  };

  return (
    <html lang="en" data-theme={initializedTheme} className={initializedTheme === "dark" ? "dark" : ""}>
      <head />
      <body>
        <div id="theme-toggle-container" className="fixed top-4 right-4 z-50 flex gap-2">
          <button
            onClick={() => toggleTheme("light")}
            className="dark-mode-toggle bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm cursor-pointer rounded-lg px-3 py-1.5 text-sm"
            title="Light mode"
          >
            ☀️
          </button>
          <button
            onClick={() => toggleTheme("dark")}
            className="dark-mode-toggle bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm cursor-pointer rounded-lg px-3 py-1.5 text-sm"
            title="Dark mode"
          >
            🌙
          </button>
          <button
            onClick={() => toggleTheme("system")}
            className="dark-mode-toggle bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm cursor-pointer rounded-lg px-3 py-1.5 text-sm"
            title="System mode"
          >
            💻
          </button>
        </div>
        {children}
      </body>
    </html>
  );
}
