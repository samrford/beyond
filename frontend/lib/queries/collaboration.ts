import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";
import { tripKeys } from "./trips";
import { planKeys } from "./plans";

// ─── Types ────────────────────────────────────────────────────────────────

export type ResourceKind = "trip" | "plan";
export type Role = "viewer" | "contributor";

export interface Collaborator {
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl: string;
  role: "owner" | Role;
}

export interface Invite {
  token: string;
  kind: ResourceKind;
  resourceId: string;
  role: Role;
  createdBy: string;
  recipientUserId?: string;
  recipientHandle?: string;
  recipientDisplayName?: string;
  recipientAvatarUrl?: string;
  createdAt: string;
  expiresAt?: string;
  maxUses?: number;
  useCount: number;
}

export interface IncomingInvite {
  token: string;
  kind: ResourceKind;
  resourceId: string;
  resourceName: string;
  ownerUserId: string;
  ownerHandle: string;
  ownerDisplayName: string;
  ownerAvatarUrl: string;
  role: Role;
  createdAt: string;
}

export interface InvitePreview {
  kind: ResourceKind;
  resourceId: string;
  resourceName: string;
  ownerHandle: string;
  ownerDisplayName: string;
  role: Role;
  isDirect: boolean;
  expired: boolean;
  revoked: boolean;
  exhausted: boolean;
  alreadyMember: boolean;
  wrongRecipient: boolean;
}

// ─── Keys ─────────────────────────────────────────────────────────────────

export const collabKeys = {
  collaborators: (kind: ResourceKind, id: string) =>
    ["collaborators", kind, id] as const,
  invites: (kind: ResourceKind, id: string) =>
    ["invites", kind, id] as const,
  incoming: () => ["invites", "incoming"] as const,
  preview: (token: string) => ["invite-preview", token] as const,
};

// ─── Helpers ──────────────────────────────────────────────────────────────

const resourcePath = (kind: ResourceKind, id: string) =>
  kind === "trip" ? `/v1/trips/${id}` : `/v1/plans/${id}`;

function invalidateResource(
  qc: ReturnType<typeof useQueryClient>,
  kind: ResourceKind,
  id: string,
) {
  if (kind === "trip") {
    qc.invalidateQueries({ queryKey: tripKeys.detail(id) });
    qc.invalidateQueries({ queryKey: tripKeys.all });
  } else {
    qc.invalidateQueries({ queryKey: planKeys.detail(id) });
    qc.invalidateQueries({ queryKey: planKeys.all });
  }
}

// ─── Collaborators ────────────────────────────────────────────────────────

export function useCollaborators(kind: ResourceKind, id: string) {
  return useQuery({
    queryKey: collabKeys.collaborators(kind, id),
    queryFn: () =>
      apiFetch<Collaborator[]>(`${resourcePath(kind, id)}/collaborators`),
    enabled: !!id,
  });
}

export function useUpdateCollaboratorRole(kind: ResourceKind, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      apiFetch<void>(`${resourcePath(kind, id)}/collaborators/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabKeys.collaborators(kind, id) });
    },
  });
}

export function useRemoveCollaborator(kind: ResourceKind, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<void>(`${resourcePath(kind, id)}/collaborators/${userId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabKeys.collaborators(kind, id) });
      invalidateResource(qc, kind, id);
    },
  });
}

// ─── Invites (per resource) ───────────────────────────────────────────────

export function useInvites(kind: ResourceKind, id: string) {
  return useQuery({
    queryKey: collabKeys.invites(kind, id),
    queryFn: () => apiFetch<Invite[]>(`${resourcePath(kind, id)}/invites`),
    enabled: !!id,
  });
}

export function useCreateInvite(kind: ResourceKind, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { role: Role; recipientUserId?: string }) =>
      apiFetch<Invite>(`${resourcePath(kind, id)}/invites`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabKeys.invites(kind, id) });
    },
  });
}

export function useRevokeInvite(kind: ResourceKind, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      apiFetch<void>(`${resourcePath(kind, id)}/invites/${token}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabKeys.invites(kind, id) });
    },
  });
}

// ─── Incoming invites (per user) ──────────────────────────────────────────

export function useIncomingInvites({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: collabKeys.incoming(),
    queryFn: () => apiFetch<IncomingInvite[]>("/v1/invites/incoming"),
    enabled,
  });
}

// ─── Token-based preview / accept / decline ───────────────────────────────

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: collabKeys.preview(token),
    queryFn: () => apiFetch<InvitePreview>(`/v1/invites/${token}`),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      apiFetch<{ kind: ResourceKind; resourceId: string }>(
        `/v1/invites/${token}/accept`,
        { method: "POST" },
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: collabKeys.incoming() });
      qc.invalidateQueries({ queryKey: collabKeys.preview(data.resourceId) });
      invalidateResource(qc, data.kind, data.resourceId);
    },
  });
}

export function useDeclineInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      apiFetch<void>(`/v1/invites/${token}/decline`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collabKeys.incoming() });
    },
  });
}
