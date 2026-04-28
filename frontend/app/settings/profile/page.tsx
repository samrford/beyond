"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, Save } from "lucide-react";
import toast from "react-hot-toast";
import PageTransition from "@/components/PageTransition";
import QueryBoundary from "@/components/QueryBoundary";
import { useAuth } from "@/components/AuthProvider";
import { useMyProfile, useUpdateMyProfile } from "@/lib/queries/profiles";
import { ApiError } from "@/lib/api";

const HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useMyProfile();
  const updateProfile = useUpdateMyProfile();

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || !data) return;
    if (data.profile) {
      setHandle(data.profile.handle);
      setDisplayName(data.profile.displayName);
      setBio(data.profile.bio);
      setAvatarUrl(data.profile.avatarUrl);
      setIsPublic(data.profile.isPublic);
    } else {
      const meta = (user?.user_metadata ?? {}) as Record<string, string>;
      setDisplayName(meta.full_name ?? meta.name ?? "");
      setAvatarUrl(meta.avatar_url ?? meta.picture ?? "");
    }
    setHydrated(true);
  }, [data, user, hydrated]);

  const isFirstTime = data?.needs_setup === true;

  const handleValid = HANDLE_PATTERN.test(handle);
  const canSubmit = handleValid && !updateProfile.isPending;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      const result = await updateProfile.mutateAsync({
        handle: handle.trim().toLowerCase(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
        isPublic,
      });
      toast.success("Profile saved");
      if (result.profile) {
        router.push(`/u/${result.profile.handle}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("That handle is already taken");
      } else if (err instanceof ApiError && err.status === 400) {
        toast.error(err.body || "Invalid input");
      } else {
        toast.error("Failed to save profile");
      }
    }
  };

  if (isLoading || isError) {
    return (
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        loadingMessage="Loading your profile..."
      />
    );
  }

  return (
    <main className="min-h-screen p-8 bg-transparent">
      <PageTransition>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isFirstTime ? "Set up your profile" : "Edit profile"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {isFirstTime
              ? "Pick a handle so other travellers can find you."
              : "Update how you appear on Beyond."}
          </p>

          <form onSubmit={onSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            {/* Handle */}
            <div>
              <label htmlFor="handle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Handle
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">@</span>
                <input
                  id="handle"
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase())}
                  placeholder="alice"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-500"
                  required
                  minLength={3}
                  maxLength={30}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                3–30 characters. Lowercase letters, digits, underscores.
                {handle && !handleValid && (
                  <span className="block text-red-600 mt-1">Handle doesn&apos;t match the allowed format.</span>
                )}
              </p>
            </div>

            {/* Display name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alice Adventures"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-primary-500"
                maxLength={80}
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A few words about you and your travel."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                rows={3}
                maxLength={280}
              />
              <p className="mt-1 text-xs text-gray-500">{bio.length}/280</p>
            </div>

            {/* Avatar */}
            <div>
              <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Avatar URL
              </label>
              <input
                id="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Visibility */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${isPublic ? "bg-primary-600" : "bg-gray-300 dark:bg-gray-600"}`}
                  aria-pressed={isPublic}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    {isPublic ? <Globe size={16} /> : <Lock size={16} />}
                    Public profile
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {isPublic
                      ? "Anyone signed in can find your profile in search and view your public trips and plans."
                      : "Your profile is hidden from search. Other users will see a “private” page if they navigate to your handle."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                <Save size={16} />
                {updateProfile.isPending ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        </div>
      </PageTransition>
    </main>
  );
}
