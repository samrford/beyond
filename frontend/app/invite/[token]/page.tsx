"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Compass, Loader2, Lock } from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/components/AuthProvider";
import {
  useAcceptInvite,
  useInvitePreview,
} from "@/lib/queries/collaboration";

export default function InviteLandingPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const { user, isLoading: authLoading } = useAuth();

  const { data: preview, isLoading, error } = useInvitePreview(token);
  const accept = useAcceptInvite();

  // Auto-redirect if the user already has access (e.g. via a different invite).
  useEffect(() => {
    if (preview?.alreadyMember) {
      router.replace(
        preview.kind === "trip"
          ? `/trip/${preview.resourceId}`
          : `/plans/${preview.resourceId}`,
      );
    }
  }, [preview, router]);

  const handleAccept = async () => {
    try {
      const res = await accept.mutateAsync(token);
      router.push(res.kind === "trip" ? `/trip/${res.resourceId}` : `/plans/${res.resourceId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invite");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950 relative overflow-hidden">
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-500/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-500/15 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-rose-600 shadow-xl shadow-primary-500/25 mb-3">
            <Compass className="w-7 h-7 text-white" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-8">
          {(isLoading || authLoading) && (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <p className="text-sm text-gray-500">Loading invitation…</p>
            </div>
          )}

          {!isLoading && error && (
            <InviteError message="This invitation link is no longer valid." />
          )}

          {!isLoading && preview && preview.revoked && (
            <InviteError message="This invitation has been revoked." />
          )}

          {!isLoading && preview && preview.expired && (
            <InviteError message="This invitation has expired." />
          )}

          {!isLoading && preview && preview.exhausted && (
            <InviteError message="This invitation link has reached its maximum number of uses." />
          )}

          {!isLoading && preview && preview.wrongRecipient && (
            <InviteError message="This invitation was sent to a different account. Sign in with the invited email to accept it." />
          )}

          {!isLoading &&
            preview &&
            !preview.revoked &&
            !preview.expired &&
            !preview.exhausted &&
            !preview.wrongRecipient && (
              <>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
                  You&apos;re invited to{" "}
                  <span className="text-primary-600 dark:text-primary-400">
                    {preview.role === "contributor" ? "edit" : "view"}
                  </span>{" "}
                  a {preview.kind}
                </h1>

                <div className="mt-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 text-center">
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {preview.resourceName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Shared by {preview.ownerDisplayName || `@${preview.ownerHandle}`}
                  </p>
                </div>

                <div className="mt-6">
                  {!user ? (
                    <div className="space-y-2">
                      <Link
                        href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}
                        className="w-full block text-center px-4 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold shadow-lg shadow-primary-500/25 transition-all"
                      >
                        Sign up to accept
                      </Link>
                      <Link
                        href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                        className="w-full block text-center px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
                      >
                        I already have an account
                      </Link>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAccept}
                      disabled={accept.isPending}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold shadow-lg shadow-primary-500/25 transition-all disabled:opacity-50"
                    >
                      {accept.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Accept invitation
                    </button>
                  )}
                </div>
              </>
            )}
        </div>
      </div>
    </main>
  );
}

function InviteError({ message }: { message: string }) {
  return (
    <div className="text-center py-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
        <Lock className="w-5 h-5 text-gray-400" />
      </div>
      <h1 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
        Invitation unavailable
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      <Link
        href="/"
        className="inline-block mt-4 text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
      >
        Go home
      </Link>
    </div>
  );
}
