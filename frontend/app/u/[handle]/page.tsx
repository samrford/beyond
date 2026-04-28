"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Lock, Globe, MapPin, Plane, Map as MapIcon } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import QueryBoundary from "@/components/QueryBoundary";
import AuthImage from "@/components/AuthImage";
import { useProfileByHandle } from "@/lib/queries/profiles";
import { getImageUrl } from "@/lib/api";

type Tab = "trips" | "plans";

export default function ProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const handle = params.handle;
  const { data, isLoading, isError, error, refetch } = useProfileByHandle(handle);
  const [activeTab, setActiveTab] = useState<Tab>("trips");

  if (isLoading || isError) {
    return (
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        loadingMessage={`Loading @${handle}...`}
        backHref="/"
        backLabel="Back home"
      />
    );
  }

  if (!data) return null;

  if (data.is_private) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center bg-transparent">
        <PageTransition>
          <div className="max-w-md mx-auto text-center space-y-6 py-12">
            <div className="w-24 h-24 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Lock size={40} className="text-gray-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              @{data.handle}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              This profile is private.
            </p>
          </div>
        </PageTransition>
      </main>
    );
  }

  const profile = data.profile;
  if (!profile) return null;

  const avatar = profile.avatarUrl;
  const initial = (profile.displayName || profile.handle).charAt(0).toUpperCase();
  const trips = data.trips ?? [];
  const plans = data.plans ?? [];

  const tabs: { id: Tab; label: string; icon: typeof Plane; count: number }[] = [
    { id: "trips", label: "Trips", icon: Plane, count: trips.length },
    { id: "plans", label: "Plans", icon: MapIcon, count: plans.length },
  ];

  return (
    <main className="min-h-screen p-8 bg-transparent">
      <PageTransition>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start mb-10">
            {avatar ? (
              <Image
                src={avatar}
                alt={profile.displayName || profile.handle}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-primary-200 dark:ring-primary-800"
                unoptimized
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-rose-500 flex items-center justify-center text-white text-3xl font-bold">
                {initial}
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {profile.displayName || `@${profile.handle}`}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 font-mono mt-1">
                @{profile.handle}
              </p>
              {profile.bio && (
                <p className="text-gray-700 dark:text-gray-300 mt-3 max-w-2xl whitespace-pre-line">
                  {profile.bio}
                </p>
              )}
              {data.is_owner && !profile.isPublic && (
                <p className="inline-flex items-center gap-2 mt-3 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full">
                  <Lock size={12} /> Your profile is private — only you can see it
                </p>
              )}
              {data.is_owner && (
                <Link
                  href="/settings/profile"
                  className="inline-block mt-4 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Edit profile
                </Link>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b-2 border-gray-100 dark:border-gray-800">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2.5 px-6 py-4 text-base font-semibold rounded-t-xl transition-all border-b-2 -mb-0.5 ${
                  activeTab === id
                    ? "border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <Icon size={20} strokeWidth={activeTab === id ? 2.5 : 2} />
                {label}
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    activeTab === id
                      ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "trips" && (
            <section>
              {trips.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  {data.is_owner
                    ? "You haven't made any trips public yet."
                    : "No public trips yet."}
                </p>
              ) : (
                <div className="grid gap-6">
                  {trips.map((t) => (
                    <Link
                      key={t.id}
                      href={`/trip/${t.id}`}
                      className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-transparent dark:border-gray-700"
                    >
                      <div className="h-48 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                        <AuthImage
                          src={getImageUrl(t.headerPhoto, 800)}
                          alt={t.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-6 relative">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                            {t.name}
                          </h3>
                          {data.is_owner && (
                            <VisibilityBadge isPublic={t.isPublic} />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {new Date(t.startDate).toLocaleDateString()} –{" "}
                          {new Date(t.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                          {t.summary}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "plans" && (
            <section>
              {plans.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  {data.is_owner
                    ? "You haven't made any plans public yet."
                    : "No public plans yet."}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plans.map((p) => (
                    <Link
                      key={p.id}
                      href={`/plans/${p.id}`}
                      className="block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1"
                    >
                      <div className="relative h-40 overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <AuthImage
                          src={getImageUrl(p.coverPhoto, 800)}
                          alt={p.name}
                          fill
                          className="object-cover transition-transform duration-500 hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4">
                          <h3 className="text-lg font-bold text-white line-clamp-1">{p.name}</h3>
                          <div className="flex items-center gap-2 text-white/80 text-xs mt-1 font-medium">
                            <MapPin size={12} />
                            {new Date(p.startDate).toLocaleDateString()} –{" "}
                            {new Date(p.endDate).toLocaleDateString()}
                          </div>
                        </div>
                        {data.is_owner && (
                          <div className="absolute top-3 right-3">
                            <VisibilityBadge isPublic={p.isPublic} />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {p.summary}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </PageTransition>
    </main>
  );
}

function VisibilityBadge({ isPublic }: { isPublic: boolean }) {
  if (isPublic) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
        <Globe size={12} /> Public
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
      <Lock size={12} /> Private
    </span>
  );
}
