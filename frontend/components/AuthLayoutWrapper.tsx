"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

const AUTH_ROUTES = ["/login", "/signup", "/reset-password"];

/**
 * Conditionally renders the sidebar + main content layout.
 * On auth pages, renders children full-screen without sidebar.
 */
export default function AuthLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-h-screen overflow-x-hidden relative bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
        {/* Background Gradients */}
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
