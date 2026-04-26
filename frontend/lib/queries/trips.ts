import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";

// ─── Types ───────────────────────────────────────────────

export type TripBgMode =
  | "default"
  | "ambient"
  | "topo"
  | "dots"
  | "diagonal"
  | "grid"
  | "waves";

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  headerPhoto: string;
  summary: string;
  bgMode: TripBgMode;
  bgBlur: number;
  bgOpacity: number;
  bgDarkness: number;
  checkpoints: Checkpoint[] | null;
}

export interface Checkpoint {
  id: string;
  name: string;
  location: string;
  timestamp: string;
  description: string;
  photos: string[];
  journal: string;
  heroPhoto?: string;
  sidePhoto1?: string;
  sidePhoto2?: string;
  sidePhoto3?: string;
}

// ─── Query Keys ──────────────────────────────────────────

export const tripKeys = {
  all: ["trips"] as const,
  detail: (id: string) => ["trip", id] as const,
};

// ─── Queries ─────────────────────────────────────────────

export function useTrips() {
  return useQuery({
    queryKey: tripKeys.all,
    queryFn: () => apiFetch<Trip[]>("/v1/trips"),
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: tripKeys.detail(id),
    queryFn: () => apiFetch<Trip>(`/v1/trips/${id}`),
    enabled: !!id,
  });
}

// ─── Mutations ───────────────────────────────────────────

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Trip>) =>
      apiFetch<Trip>("/v1/trips", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useUpdateTrip(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Trip>) =>
      apiFetch<Trip>(`/v1/trips/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/v1/trips/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useCreateCheckpoint(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Checkpoint>) =>
      apiFetch<Checkpoint>(`/v1/trips/${tripId}/checkpoints`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
    },
  });
}

export function useUpdateCheckpoint(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      checkpointId,
      data,
    }: {
      checkpointId: string;
      data: Partial<Checkpoint>;
    }) =>
      apiFetch<Checkpoint>(`/v1/checkpoints/${checkpointId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
    },
  });
}

export function useDeleteCheckpoint(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (checkpointId: string) =>
      apiFetch<void>(`/v1/checkpoints/${checkpointId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
    },
  });
}
