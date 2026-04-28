import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../api";

export interface Profile {
  userId: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MyProfileResponse {
  profile?: Profile;
  needs_setup: boolean;
}

export interface TripSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  headerPhoto: string;
  summary: string;
  isPublic: boolean;
}

export interface PlanSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  summary: string;
  coverPhoto: string;
  isPublic: boolean;
}

export interface ProfileView {
  profile?: Profile;
  is_owner?: boolean;
  is_private?: boolean;
  handle?: string;
  trips?: TripSummary[];
  plans?: PlanSummary[];
}

export interface SearchHit {
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl: string;
}

export interface ProfileUpdateInput {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
}

export const profileKeys = {
  me: ["profile", "me"] as const,
  byHandle: (handle: string) => ["profile", "byHandle", handle.toLowerCase()] as const,
  search: (q: string) => ["users", "search", q.toLowerCase()] as const,
};

export function useMyProfile({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: () => apiFetch<MyProfileResponse>("/v1/profiles/me"),
    staleTime: 30_000,
    enabled,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 401) return false;
      return failureCount < 2;
    },
  });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation<MyProfileResponse, ApiError, ProfileUpdateInput>({
    mutationFn: (data) =>
      apiFetch<MyProfileResponse>("/v1/profiles/me", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      qc.setQueryData(profileKeys.me, data);
      if (data.profile) {
        qc.invalidateQueries({ queryKey: profileKeys.byHandle(data.profile.handle) });
      }
    },
  });
}

export function useProfileByHandle(handle: string) {
  return useQuery<ProfileView, ApiError>({
    queryKey: profileKeys.byHandle(handle),
    queryFn: () => apiFetch<ProfileView>(`/v1/profiles/${encodeURIComponent(handle)}`),
    enabled: !!handle,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useUserSearch(q: string) {
  const trimmed = q.trim();
  return useQuery<SearchHit[]>({
    queryKey: profileKeys.search(trimmed),
    queryFn: () => apiFetch<SearchHit[]>(`/v1/users/search?q=${encodeURIComponent(trimmed)}`),
    enabled: trimmed.length >= 2,
    staleTime: 10_000,
  });
}
