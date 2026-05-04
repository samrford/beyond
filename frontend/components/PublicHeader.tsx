"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";

/**
 * Top header rendered on public resource pages (profiles, trips, plans)
 * when no user is signed in. Shows the brand and a prominent sign-up CTA.
 */
export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-orange-950/85 backdrop-blur-xl border-b border-orange-100 dark:border-orange-900/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center flex-shrink-0">
          <Image
            src="/transplogo.png"
            alt="Beyond"
            width={120}
            height={40}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>

        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <Sparkles size={16} className="text-primary-500" />
          <span className="font-medium">
            Sign up to start building your own adventures!
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-primary-500 to-rose-500 text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Sign up for free
          </Link>
        </div>
      </div>

      {/* Mobile-only message line */}
      <div className="sm:hidden px-4 pb-2 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
        <Sparkles size={12} className="text-primary-500" />
        <span>Sign up to start building your own adventures!</span>
      </div>
    </header>
  );
}
