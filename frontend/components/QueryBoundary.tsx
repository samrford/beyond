"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import LoadingGlobe from "@/components/LoadingGlobe";
import { ApiError } from "@/lib/api";

interface QueryBoundaryProps {
  isLoading: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  loadingMessage?: string;
  notFound?: boolean;
  notFoundMessage?: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

export default function QueryBoundary({
  isLoading,
  isError,
  error,
  onRetry,
  loadingMessage,
  notFound,
  notFoundMessage,
  backHref,
  backLabel,
  children,
}: QueryBoundaryProps) {
  if (isLoading) {
    return (
      <main className="min-h-screen p-8 bg-transparent flex items-center justify-center">
        <LoadingGlobe message={loadingMessage} />
      </main>
    );
  }

  if (isError) {
    const status = error instanceof ApiError ? error.status : undefined;
    const headline =
      status === 404
        ? "We couldn't find that."
        : "Something went wrong loading this page.";
    const detail =
      status === 404
        ? "It may have been deleted, or the link might be wrong."
        : status
          ? `The server responded with ${status}. Please try again in a moment.`
          : "We couldn't reach the server. Please check your connection and try again.";

    return (
      <main className="min-h-screen p-8 bg-transparent flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
              <AlertTriangle size={28} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {headline}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{detail}</p>
          <div className="flex justify-center gap-3">
            {onRetry && status !== 404 && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw size={16} />
                Try again
              </button>
            )}
            {backHref && (
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft size={16} />
                {backLabel ?? "Back"}
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen p-8 bg-transparent flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Not found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {notFoundMessage ?? "We couldn't find what you were looking for."}
          </p>
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              <ArrowLeft size={16} />
              {backLabel ?? "Back"}
            </Link>
          )}
        </div>
      </main>
    );
  }

  return <>{children ?? null}</>;
}
