"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "./AuthProvider";
import { useMyProfile } from "@/lib/queries/profiles";

const AUTH_ROUTES = ["/login", "/signup", "/reset-password"];
const SETUP_PATH = "/settings/profile";

/**
 * Conditionally renders the sidebar + main content layout.
 * On auth pages, renders children full-screen without sidebar.
 * Also redirects authenticated users without a profile to the setup page.
 */
export default function AuthLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const isAuthPage = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const { data: profileData } = useMyProfile({ enabled: !!user });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (isAuthPage) return;
    if (pathname === SETUP_PATH) return;
    if (profileData?.needs_setup) {
      router.replace(SETUP_PATH);
    }
  }, [authLoading, user, isAuthPage, pathname, profileData, router]);

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
