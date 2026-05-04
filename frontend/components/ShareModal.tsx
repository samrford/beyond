"use client";

import { useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { Copy, Link2, Loader2, Trash2, X } from "lucide-react";

import {
  type ResourceKind,
  type Role,
  useCollaborators,
  useCreateInvite,
  useInvites,
  useRemoveCollaborator,
  useRevokeInvite,
  useUpdateCollaboratorRole,
} from "@/lib/queries/collaboration";
import UserPicker from "./UserPicker";

interface ShareModalProps {
  kind: ResourceKind;
  resourceId: string;
  onClose: () => void;
}

export default function ShareModal({ kind, resourceId, onClose }: ShareModalProps) {
  const [pendingRole, setPendingRole] = useState<Role>("contributor");
  const [linkRole, setLinkRole] = useState<Role>("viewer");
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  const collaboratorsQ = useCollaborators(kind, resourceId);
  const invitesQ = useInvites(kind, resourceId);
  const updateRole = useUpdateCollaboratorRole(kind, resourceId);
  const removeCollab = useRemoveCollaborator(kind, resourceId);
  const createInvite = useCreateInvite(kind, resourceId);
  const revokeInvite = useRevokeInvite(kind, resourceId);

  const collaborators = collaboratorsQ.data ?? [];
  const invites = invitesQ.data ?? [];

  const owner = collaborators.find((c) => c.role === "owner");
  const others = collaborators.filter((c) => c.role !== "owner");
  const directInvites = invites.filter((i) => i.recipientUserId);
  const linkInvites = invites.filter((i) => !i.recipientUserId);

  const excludeUserIds = [
    ...collaborators.map((c) => c.userId),
    ...directInvites
      .map((i) => i.recipientUserId)
      .filter((id): id is string => !!id),
  ];

  const buildInviteUrl = (token: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/invite/${token}` : "";

  const handleCreateLink = async () => {
    setCreatedLink(null);
    try {
      const inv = await createInvite.mutateAsync({ role: linkRole });
      setCreatedLink(buildInviteUrl(inv.token));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create link");
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleInviteUser = async (userId: string) => {
    try {
      await createInvite.mutateAsync({ role: pendingRole, recipientUserId: userId });
      toast.success("Invitation sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite user");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Share {kind}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* People with access */}
        <section className="px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            People with access
          </h3>
          {collaboratorsQ.isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <ul className="space-y-2">
              {owner && <CollaboratorRow collaborator={owner} disabled />}
              {others.map((c) => (
                <CollaboratorRow
                  key={c.userId}
                  collaborator={c}
                  onChangeRole={(role) =>
                    updateRole.mutate({ userId: c.userId, role })
                  }
                  onRemove={() => removeCollab.mutate(c.userId)}
                />
              ))}
            </ul>
          )}
        </section>

        {/* Pending direct invites */}
        {directInvites.length > 0 && (
          <section className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Pending invitations
            </h3>
            <ul className="space-y-2">
              {directInvites.map((inv) => (
                <li
                  key={inv.token}
                  className="flex items-center justify-between gap-2 py-1.5"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {inv.recipientAvatarUrl ? (
                      <Image
                        src={inv.recipientAvatarUrl}
                        alt={inv.recipientHandle ?? ""}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-white text-sm font-bold">
                        {(inv.recipientHandle || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {inv.recipientDisplayName || inv.recipientHandle}
                      </p>
                      <p className="text-xs text-gray-500">
                        Invited as {inv.role} · awaiting acceptance
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => revokeInvite.mutate(inv.token)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
                    title="Revoke invite"
                    aria-label="Revoke invite"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Add a person */}
        <section className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Invite a person
          </h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <UserPicker
                placeholder="Search by handle or name"
                excludeUserIds={excludeUserIds}
                onSelect={(hit) => handleInviteUser(hit.userId)}
              />
            </div>
            <RoleSelect value={pendingRole} onChange={setPendingRole} />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            They&apos;ll see this invitation in their &ldquo;Invitations&rdquo; inbox
            and need to accept it.
          </p>
        </section>

        {/* Invite link */}
        <section className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Invite link
          </h3>
          <div className="flex gap-2 items-center">
            <RoleSelect value={linkRole} onChange={setLinkRole} />
            <button
              type="button"
              onClick={handleCreateLink}
              disabled={createInvite.isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {createInvite.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Link2 size={14} />
              )}
              Create link
            </button>
          </div>

          {createdLink && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <input
                readOnly
                value={createdLink}
                className="flex-1 bg-transparent text-xs text-gray-700 dark:text-gray-200 font-mono outline-none"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={() => handleCopy(createdLink)}
                className="p-1.5 text-gray-500 hover:text-primary-600"
                title="Copy"
              >
                <Copy size={14} />
              </button>
            </div>
          )}

          {linkInvites.length > 0 && (
            <ul className="mt-4 space-y-2">
              {linkInvites.map((inv) => {
                const url = buildInviteUrl(inv.token);
                return (
                  <li
                    key={inv.token}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-gray-700 dark:text-gray-200 truncate">
                        {url}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {inv.role} · {inv.useCount} use{inv.useCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(url)}
                      className="p-1.5 text-gray-500 hover:text-primary-600"
                      title="Copy"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => revokeInvite.mutate(inv.token)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
                      title="Revoke"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function RoleSelect({
  value,
  onChange,
}: {
  value: Role;
  onChange: (r: Role) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Role)}
      className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      <option value="viewer">Viewer</option>
      <option value="contributor">Contributor</option>
    </select>
  );
}

function CollaboratorRow({
  collaborator,
  disabled,
  onChangeRole,
  onRemove,
}: {
  collaborator: {
    userId: string;
    handle: string;
    displayName: string;
    avatarUrl: string;
    role: "owner" | Role;
  };
  disabled?: boolean;
  onChangeRole?: (role: Role) => void;
  onRemove?: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {collaborator.avatarUrl ? (
          <Image
            src={collaborator.avatarUrl}
            alt={collaborator.displayName || collaborator.handle}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-rose-500 flex items-center justify-center text-white text-sm font-bold">
            {(collaborator.displayName || collaborator.handle || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
            {collaborator.displayName || collaborator.handle}
          </p>
          <p className="text-xs text-gray-500 font-mono truncate">
            @{collaborator.handle}
          </p>
        </div>
      </div>
      {disabled ? (
        <span className="text-xs font-medium text-gray-500 px-2">Owner</span>
      ) : (
        <>
          <select
            value={collaborator.role}
            onChange={(e) => onChangeRole?.(e.target.value as Role)}
            className="px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="viewer">Viewer</option>
            <option value="contributor">Contributor</option>
          </select>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
            title="Remove"
            aria-label="Remove collaborator"
          >
            <Trash2 size={16} />
          </button>
        </>
      )}
    </li>
  );
}
