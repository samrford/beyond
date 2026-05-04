import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";

// ─── Types ───────────────────────────────────────────────

import type { CollaboratorRole } from "./trips";

export interface Plan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  summary: string;
  coverPhoto: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  isOwner: boolean;
  role: CollaboratorRole;
  days: PlanDay[];
  unassigned: PlanItem[];
}

export interface PlanDay {
  id: string;
  planId: string;
  date: string;
  notes: string;
  items: PlanItem[];
}

export interface PlanItem {
  id: string;
  planId: string;
  planDayId: string | null;
  name: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  orderIndex: number;
  estimatedTime: string;
  startTime: string | null;
  duration: number;
}

// ─── Query Keys ──────────────────────────────────────────

export const planKeys = {
  all: ["plans"] as const,
  detail: (id: string) => ["plan", id] as const,
};

// ─── Queries ─────────────────────────────────────────────

export function usePlans() {
  return useQuery({
    queryKey: planKeys.all,
    queryFn: () => apiFetch<Plan[]>("/v1/plans"),
  });
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: planKeys.detail(id),
    queryFn: () => apiFetch<Plan>(`/v1/plans/${id}`),
    enabled: !!id,
  });
}

// ─── Mutations ───────────────────────────────────────────

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Plan>) =>
      apiFetch<Plan>("/v1/plans", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

export function useUpdatePlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Plan>) =>
      apiFetch<Plan>(`/v1/plans/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/v1/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

export function useCreatePlanDay(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string }) =>
      apiFetch<PlanDay>(`/v1/plans/${planId}/days`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) });
    },
  });
}

export function useCreatePlanItem(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PlanItem>) =>
      apiFetch<PlanItem>(`/v1/plans/${planId}/items`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) });
    },
  });
}

export function useUpdatePlanItem(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PlanItem) =>
      apiFetch<PlanItem>(`/v1/plans/items/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) });
    },
  });
}

export function useDeletePlanItem(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch<void>(`/v1/plans/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) });
    },
  });
}

export function useConvertPlanToTrip(planId: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ tripId: string }>(`/v1/plans/${planId}/convert`, {
        method: "POST",
      }),
  });
}

export function useImportPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Plan>) =>
      apiFetch<Plan>("/v1/plans/import", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}
