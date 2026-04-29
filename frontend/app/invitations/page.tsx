"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Mail } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import {
  useAcceptInvite,
  useDeclineInvite,
  useIncomingInvites,
} from "@/lib/queries/collaboration";

export default function InvitationsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const enabled = !!user;
  const { data, isLoading } = useIncomingInvites({ enabled });
  const accept = useAcceptInvite();
  const decline = useDeclineInvite();

  if (authLoading) {
    return <PageShell><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <div className="text-center py-10">
          <Mail className="w-8 h-8 mx-auto text-gray-400" />
          <p className="mt-3 text-gray-500">Sign in to see your invitations.</p>
          <Link href="/login" className="inline-block mt-4 text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </PageShell>
    );
  }

  const invites = data ?? [];

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invitations</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          People who&apos;ve invited you to view or edit their trips and plans.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {!isLoading && invites.length === 0 && (
        <div className="text-center py-12 px-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <Mail className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-gray-500">No pending invitations.</p>
        </div>
      )}

      {!isLoading && invites.length > 0 && (
        <ul className="space-y-3">
          {invites.map((inv) => (
            <li
              key={inv.token}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            >
              <div className="flex items-center gap-3 min-w-0">
                {inv.ownerAvatarUrl ? (
                  <Image
                    src={inv.ownerAvatarUrl}
                    alt={inv.ownerHandle}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-rose-500 flex items-center justify-center text-white font-bold">
                    {(inv.ownerDisplayName || inv.ownerHandle).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    <span className="font-medium">
                      {inv.ownerDisplayName || `@${inv.ownerHandle}`}
                    </span>{" "}
                    invited you to{" "}
                    <span className="font-medium text-primary-600 dark:text-primary-400">
                      {inv.role === "contributor" ? "edit" : "view"}
                    </span>{" "}
                    {inv.kind} <span className="font-medium">&ldquo;{inv.resourceName}&rdquo;</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0 sm:justify-end">
                <button
                  onClick={() => decline.mutate(inv.token)}
                  disabled={decline.isPending}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await accept.mutateAsync(inv.token);
                      router.push(
                        res.kind === "trip"
                          ? `/trip/${res.resourceId}`
                          : `/plans/${res.resourceId}`,
                      );
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to accept");
                    }
                  }}
                  disabled={accept.isPending}
                  className="px-3 py-1.5 text-sm rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium disabled:opacity-50"
                >
                  Accept
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4">
      <div className="max-w-2xl mx-auto">{children}</div>
    </main>
  );
}
