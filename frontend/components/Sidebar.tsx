"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map,
  Plane,
  Moon,
  Sun,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Compass,
  Settings,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "../app/ThemeClient";
import { useAuth } from "./AuthProvider";

const Sidebar = () => {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const navItems = [
    { name: "Home", href: "/", icon: Compass },
    { name: "My Plans", href: "/plans", icon: Map },
    { name: "My Trips", href: "/trips", icon: Plane },
  ];

  if (process.env.NEXT_PUBLIC_DEV_STYLING === "true") {
    navItems.push({
      name: "Design System",
      href: "/test/design",
      icon: LayoutDashboard,
    });
  }

  const themeOptions = [
    { id: "light", name: "Light", icon: Sun },
    { id: "dark", name: "Dark", icon: Moon },
    { id: "system", name: "System", icon: Monitor },
  ] as const;

  // Close mobile sidebar on navigation
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Get user display info
  const userEmail = user?.email ?? "";
  const userAvatar =
    user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;
  const userName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    userEmail.split("@")[0];
  const userInitial = (userName || userEmail || "?").charAt(0).toUpperCase();

  const sidebarClasses = `
    fixed top-0 left-0 h-screen z-40
    transition-all duration-300 ease-in-out
    bg-white/80 dark:bg-orange-950/80 backdrop-blur-xl
    border-r border-orange-100 dark:border-orange-900/50
    flex flex-col
    ${isOpen ? "w-64" : "w-20"}
    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
  `;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white/90 dark:bg-gray-800/90 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
      >
        <Menu size={24} />
      </button>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={sidebarClasses}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            {isOpen ? (
              <img
                src="/transplogo.png"
                alt="Beyond Logo"
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div className="w-full flex justify-center">
                <img
                  src="/transplogosmall.png"
                  alt="B"
                  className="w-10 h-10 object-contain drop-shadow-md"
                />
              </div>
            )}
          </Link>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                  ${isActive
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }
                  ${!isOpen ? "justify-center" : ""}
                `}
                title={item.name}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isOpen && <span className="text-sm">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User + Settings */}
        <div className="p-4 border-t border-orange-100 dark:border-orange-900/50 space-y-2">
          {/* Theme Selector */}
          {showSettings && (
            <div
              className={`flex items-center bg-orange-50 dark:bg-orange-900/40 rounded-xl p-1 transition-all duration-300 ${!isOpen ? "flex-col" : "justify-between"
                }`}
            >
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = theme === opt.id;

                return (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={`
                      p-2 rounded-lg transition-all duration-200 flex-1 flex justify-center
                      ${isActive
                        ? "bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      }
                    `}
                    title={opt.name}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
              ${showSettings
                ? "bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }
              ${!isOpen ? "justify-center" : ""}
            `}
            title="Settings"
          >
            <Settings
              size={22}
              className={showSettings ? "animate-spin-slow" : ""}
            />
            {isOpen && <span className="text-sm">Settings</span>}
          </button>

          {/* User Info */}
          {user && (
            <div
              className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 ${!isOpen ? "justify-center" : ""
                }`}
            >
              {/* Avatar */}
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-primary-200 dark:ring-primary-800"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-rose-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {userInitial}
                </div>
              )}

              {isOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                </div>
              )}

              {/* Sign Out */}
              <button
                onClick={signOut}
                className={`p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0 ${!isOpen ? "hidden" : ""
                  }`}
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content padding spacer */}
      <div
        className={`hidden lg:block transition-all duration-300 ${isOpen ? "w-64" : "w-20"
          }`}
      />
    </>
  );
};

export default Sidebar;
